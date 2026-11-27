//! Master-password key derivation (spec §3): Argon2id → HKDF-SHA-256 → KEK.

use argon2::{Algorithm, Argon2, Params, Version};
use hkdf::Hkdf;
use sha2::Sha256;
use zeroize::Zeroizing;

use crate::envelope::KEY_LEN;
use crate::error::CryptoError;
use crate::rng;

/// KDF algorithm identifier for Argon2id v1.3 (used in the AAD descriptor).
pub const KDF_ALGORITHM_ARGON2ID: u8 = 0x01;
/// Salt length in bytes.
pub const SALT_LEN: usize = 16;
/// HKDF `info` string for the key-encryption key.
pub const HKDF_INFO_KEK: &[u8] = b"cachepass/v1/kek";
/// Maximum accepted master password length in bytes (1024 chars × 4 bytes).
pub const MAX_PASSWORD_BYTES: usize = 4096;

/// Default memory cost in KiB (64 MiB).
pub const DEFAULT_MEMORY_KIB: u32 = 65_536;
/// Minimum memory cost in KiB (OWASP: 19 MiB).
pub const MIN_MEMORY_KIB: u32 = 19_456;
/// Maximum memory cost in KiB (1 GiB).
pub const MAX_MEMORY_KIB: u32 = 1_048_576;
/// Default iteration count.
pub const DEFAULT_ITERATIONS: u32 = 3;
/// Minimum iteration count.
pub const MIN_ITERATIONS: u32 = 2;
/// Maximum iteration count.
pub const MAX_ITERATIONS: u32 = 32;
/// Default parallelism.
pub const DEFAULT_PARALLELISM: u32 = 1;
/// Minimum parallelism.
pub const MIN_PARALLELISM: u32 = 1;
/// Maximum parallelism.
pub const MAX_PARALLELISM: u32 = 16;

/// Validated Argon2id parameters plus salt.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct KdfParams {
    memory_kib: u32,
    iterations: u32,
    parallelism: u32,
    salt: [u8; SALT_LEN],
}

impl KdfParams {
    /// Validate parameters against the accepted bounds (spec §3.2). Anything
    /// outside them — including parameters sent by a malicious server — is
    /// rejected before any work is done.
    pub fn new(memory_kib: u32, iterations: u32, parallelism: u32, salt: &[u8]) -> Result<Self, CryptoError> {
        let in_bounds = (MIN_MEMORY_KIB..=MAX_MEMORY_KIB).contains(&memory_kib)
            && (MIN_ITERATIONS..=MAX_ITERATIONS).contains(&iterations)
            && (MIN_PARALLELISM..=MAX_PARALLELISM).contains(&parallelism)
            // Argon2 requires m ≥ 8·p; implied by the bounds, checked anyway.
            && memory_kib >= 8 * parallelism;
        if !in_bounds {
            return Err(CryptoError::InvalidKdfParams);
        }
        let salt: [u8; SALT_LEN] = salt.try_into().map_err(|_| CryptoError::InvalidKdfParams)?;
        Ok(Self {
            memory_kib,
            iterations,
            parallelism,
            salt,
        })
    }

    /// Current default parameters with a fresh random salt.
    pub fn generate_default() -> Result<Self, CryptoError> {
        let salt = rng::bytes::<SALT_LEN>()?;
        Self::new(DEFAULT_MEMORY_KIB, DEFAULT_ITERATIONS, DEFAULT_PARALLELISM, &salt)
    }

    /// Memory cost in KiB.
    pub const fn memory_kib(&self) -> u32 {
        self.memory_kib
    }
    /// Iteration count.
    pub const fn iterations(&self) -> u32 {
        self.iterations
    }
    /// Parallelism.
    pub const fn parallelism(&self) -> u32 {
        self.parallelism
    }
    /// Salt bytes.
    pub const fn salt(&self) -> &[u8; SALT_LEN] {
        &self.salt
    }

    /// 29-byte descriptor bound into the vault-key AAD:
    /// `alg ‖ u32be(m) ‖ u32be(t) ‖ u32be(p) ‖ salt`.
    pub fn descriptor(&self) -> [u8; 29] {
        let mut out = [0u8; 29];
        let mut parts = Vec::with_capacity(29);
        parts.push(KDF_ALGORITHM_ARGON2ID);
        parts.extend_from_slice(&self.memory_kib.to_be_bytes());
        parts.extend_from_slice(&self.iterations.to_be_bytes());
        parts.extend_from_slice(&self.parallelism.to_be_bytes());
        parts.extend_from_slice(&self.salt);
        out.copy_from_slice(&parts);
        out
    }
}

/// Derive the 32-byte key-encryption key from the (NFC-normalised, UTF-8)
/// master password. Intermediate key material is zeroized on drop.
pub(crate) fn derive_kek(password: &[u8], params: &KdfParams) -> Result<Zeroizing<[u8; KEY_LEN]>, CryptoError> {
    if password.is_empty() || password.len() > MAX_PASSWORD_BYTES {
        return Err(CryptoError::InvalidLength);
    }
    let argon_params = Params::new(params.memory_kib, params.iterations, params.parallelism, Some(KEY_LEN))
        .map_err(|_| CryptoError::InvalidKdfParams)?;
    let argon = Argon2::new(Algorithm::Argon2id, Version::V0x13, argon_params);

    let mut ikm = Zeroizing::new([0u8; KEY_LEN]);
    argon
        .hash_password_into(password, &params.salt, ikm.as_mut())
        .map_err(|_| CryptoError::KdfFailed)?;

    let mut kek = Zeroizing::new([0u8; KEY_LEN]);
    Hkdf::<Sha256>::new(None, ikm.as_ref())
        .expand(HKDF_INFO_KEK, kek.as_mut())
        .map_err(|_| CryptoError::KdfFailed)?;
    Ok(kek)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn bounds_are_enforced() {
        let salt = [0u8; SALT_LEN];
        assert!(KdfParams::new(MIN_MEMORY_KIB, MIN_ITERATIONS, MIN_PARALLELISM, &salt).is_ok());
        assert!(KdfParams::new(MAX_MEMORY_KIB, MAX_ITERATIONS, MAX_PARALLELISM, &salt).is_ok());
        assert!(KdfParams::new(MIN_MEMORY_KIB - 1, 3, 1, &salt).is_err());
        assert!(KdfParams::new(MAX_MEMORY_KIB + 1, 3, 1, &salt).is_err());
        assert!(KdfParams::new(65_536, 1, 1, &salt).is_err());
        assert!(KdfParams::new(65_536, 33, 1, &salt).is_err());
        assert!(KdfParams::new(65_536, 3, 0, &salt).is_err());
        assert!(KdfParams::new(65_536, 3, 17, &salt).is_err());
        assert!(KdfParams::new(65_536, 3, 1, &[0u8; 15]).is_err());
        assert!(KdfParams::new(65_536, 3, 1, &[0u8; 17]).is_err());
    }

    #[test]
    fn default_salts_are_random() {
        let a = KdfParams::generate_default().ok();
        let b = KdfParams::generate_default().ok();
        assert!(a.is_some() && b.is_some());
        assert_ne!(a.map(|p| p.salt), b.map(|p| p.salt));
    }

    #[test]
    fn descriptor_layout() {
        let p = KdfParams::new(19_456, 2, 1, &[9u8; 16]).ok();
        let d = p.map(|p| p.descriptor()).unwrap_or([0; 29]);
        assert_eq!(d[0], 1);
        assert_eq!(&d[1..5], &19_456u32.to_be_bytes());
        assert_eq!(&d[5..9], &2u32.to_be_bytes());
        assert_eq!(&d[9..13], &1u32.to_be_bytes());
        assert_eq!(&d[13..], &[9u8; 16]);
    }

    #[test]
    fn rejects_empty_or_oversized_password() {
        let p = KdfParams::new(MIN_MEMORY_KIB, 2, 1, &[0u8; 16]);
        assert!(p.is_ok());
        if let Ok(p) = p {
            assert_eq!(derive_kek(b"", &p).err(), Some(CryptoError::InvalidLength));
            let long = vec![b'a'; MAX_PASSWORD_BYTES + 1];
            assert_eq!(derive_kek(&long, &p).err(), Some(CryptoError::InvalidLength));
        }
    }
}
