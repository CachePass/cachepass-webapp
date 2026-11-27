//! Envelope v1 (spec §4): `version ‖ algorithm ‖ nonce(24) ‖ ciphertext ‖ tag(16)`.

use chacha20poly1305::aead::{Aead, KeyInit, Payload};
use chacha20poly1305::{XChaCha20Poly1305, XNonce};
use zeroize::Zeroizing;

use crate::error::CryptoError;
use crate::rng;

/// Envelope format version 1.
pub const VERSION_1: u8 = 0x01;
/// Algorithm identifier for XChaCha20-Poly1305.
pub const ALGORITHM_XCHACHA20POLY1305: u8 = 0x01;
/// Nonce length in bytes.
pub const NONCE_LEN: usize = 24;
/// Poly1305 tag length in bytes.
pub const TAG_LEN: usize = 16;
/// Bytes before the ciphertext (version, algorithm, nonce).
pub const HEADER_LEN: usize = 2 + NONCE_LEN;
/// Smallest valid envelope (empty plaintext).
pub const MIN_LEN: usize = HEADER_LEN + TAG_LEN;
/// Symmetric key length in bytes.
pub const KEY_LEN: usize = 32;

fn cipher(key: &[u8; KEY_LEN]) -> XChaCha20Poly1305 {
    XChaCha20Poly1305::new(key.into())
}

/// Encrypt with an explicit nonce. Only the random-nonce [`seal`] is reachable
/// from production code; fixed nonces exist solely for test vectors.
pub(crate) fn seal_with_nonce(
    key: &[u8; KEY_LEN],
    nonce: &[u8; NONCE_LEN],
    aad: &[u8],
    plaintext: &[u8],
) -> Result<Vec<u8>, CryptoError> {
    let ciphertext = cipher(key)
        .encrypt(&XNonce::from(*nonce), Payload { msg: plaintext, aad })
        .map_err(|_| CryptoError::PlaintextTooLarge)?;
    let mut out = Vec::with_capacity(HEADER_LEN + ciphertext.len());
    out.push(VERSION_1);
    out.push(ALGORITHM_XCHACHA20POLY1305);
    out.extend_from_slice(nonce);
    out.extend_from_slice(&ciphertext);
    Ok(out)
}

/// Encrypt under a fresh random 192-bit nonce.
pub(crate) fn seal(key: &[u8; KEY_LEN], aad: &[u8], plaintext: &[u8]) -> Result<Vec<u8>, CryptoError> {
    let nonce = rng::bytes::<NONCE_LEN>()?;
    seal_with_nonce(key, &nonce, aad, plaintext)
}

/// Validate the header and authenticate/decrypt. `aad` must already contain
/// the header bytes (see [`crate::aad::build`]).
pub(crate) fn open(key: &[u8; KEY_LEN], aad: &[u8], envelope: &[u8]) -> Result<Zeroizing<Vec<u8>>, CryptoError> {
    let (header, body) = envelope
        .split_at_checked(HEADER_LEN)
        .ok_or(CryptoError::MalformedEnvelope)?;
    let [version, algorithm, nonce @ ..] = header else {
        return Err(CryptoError::MalformedEnvelope);
    };
    if *version != VERSION_1 || *algorithm != ALGORITHM_XCHACHA20POLY1305 || body.len() < TAG_LEN {
        return Err(CryptoError::MalformedEnvelope);
    }
    let nonce = XNonce::try_from(nonce).map_err(|_| CryptoError::MalformedEnvelope)?;
    cipher(key)
        .decrypt(&nonce, Payload { msg: body, aad })
        .map(Zeroizing::new)
        .map_err(|_| CryptoError::DecryptionFailed)
}

#[cfg(test)]
mod tests {
    use super::*;

    const KEY: [u8; 32] = [7u8; 32];

    #[test]
    fn roundtrip_and_layout() {
        let env = seal(&KEY, b"aad", b"hello").ok().unwrap_or_default();
        assert_eq!(env.len(), HEADER_LEN + 5 + TAG_LEN);
        assert_eq!(env.first(), Some(&VERSION_1));
        assert_eq!(env.get(1), Some(&ALGORITHM_XCHACHA20POLY1305));
        assert_eq!(
            open(&KEY, b"aad", &env).ok().map(|p| p.to_vec()),
            Some(b"hello".to_vec())
        );
    }

    #[test]
    fn nonces_are_unique() {
        let a = seal(&KEY, b"", b"same").ok().unwrap_or_default();
        let b = seal(&KEY, b"", b"same").ok().unwrap_or_default();
        assert_ne!(a.get(2..HEADER_LEN), b.get(2..HEADER_LEN));
        assert_ne!(a, b);
    }

    #[test]
    fn rejects_tampering() {
        let env = seal(&KEY, b"aad", b"hello").ok().unwrap_or_default();
        for i in 0..env.len() {
            let mut bad = env.clone();
            if let Some(b) = bad.get_mut(i) {
                *b ^= 0x01;
            }
            assert!(open(&KEY, b"aad", &bad).is_err(), "flip at byte {i} accepted");
        }
        assert_eq!(open(&KEY, b"other", &env).err(), Some(CryptoError::DecryptionFailed));
        assert_eq!(
            open(&[8u8; 32], b"aad", &env).err(),
            Some(CryptoError::DecryptionFailed)
        );
    }

    #[test]
    fn rejects_malformed() {
        assert_eq!(open(&KEY, b"", &[]).err(), Some(CryptoError::MalformedEnvelope));
        assert_eq!(
            open(&KEY, b"", &[1u8; MIN_LEN - 1]).err(),
            Some(CryptoError::MalformedEnvelope)
        );
        let mut env = seal(&KEY, b"", b"x").ok().unwrap_or_default();
        if let Some(v) = env.first_mut() {
            *v = 2;
        }
        assert_eq!(open(&KEY, b"", &env).err(), Some(CryptoError::MalformedEnvelope));
    }
}
