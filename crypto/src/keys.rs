//! Key types and the operations the webapp performs with them (spec §3, §5–§8).
//!
//! Key bytes live only inside these types, which zeroize themselves on drop.
//! Neither type exposes its bytes outside the crate.

use zeroize::{Zeroize, ZeroizeOnDrop, Zeroizing};

use crate::aad::{self, CONTEXT_FOLDER, CONTEXT_ITEM, CONTEXT_VAULT_KEY};
use crate::envelope::{self, KEY_LEN, MIN_LEN};
use crate::error::CryptoError;
use crate::kdf::{self, KdfParams};
use crate::padding;
use crate::rng;

/// Raw 16-byte UUID (RFC 9562 byte order).
pub type Uuid = [u8; 16];

/// Exact size of a wrapped vault key envelope.
pub const WRAPPED_KEY_LEN: usize = MIN_LEN + KEY_LEN;
/// Maximum size of an item envelope.
pub const MAX_ITEM_ENVELOPE_LEN: usize = 262_144;
/// Maximum size of a folder envelope.
pub const MAX_FOLDER_ENVELOPE_LEN: usize = 4_096;

/// Key-encryption key derived from the master password. Short-lived: create,
/// wrap/unwrap, drop.
#[derive(Zeroize, ZeroizeOnDrop)]
pub struct Kek([u8; KEY_LEN]);

impl Kek {
    /// Run Argon2id + HKDF over the master password.
    pub fn derive(password: &[u8], params: &KdfParams) -> Result<Self, CryptoError> {
        let kek = kdf::derive_kek(password, params)?;
        Ok(Self(*kek))
    }

    fn wrap_aad(vault_id: &Uuid, params: &KdfParams) -> Vec<u8> {
        aad::build(CONTEXT_VAULT_KEY, &[vault_id, &params.descriptor()])
    }

    /// Encrypt the vault key under this KEK.
    pub fn wrap(&self, vault_id: &Uuid, params: &KdfParams, key: &VaultKey) -> Result<Vec<u8>, CryptoError> {
        envelope::seal(&self.0, &Self::wrap_aad(vault_id, params), &key.0)
    }

    #[cfg(test)]
    pub(crate) fn wrap_with_nonce(
        &self,
        vault_id: &Uuid,
        params: &KdfParams,
        key: &VaultKey,
        nonce: &[u8; envelope::NONCE_LEN],
    ) -> Result<Vec<u8>, CryptoError> {
        envelope::seal_with_nonce(&self.0, nonce, &Self::wrap_aad(vault_id, params), &key.0)
    }

    /// Decrypt a wrapped vault key. Fails with [`CryptoError::DecryptionFailed`]
    /// when the master password (or anything bound in the AAD) is wrong.
    pub fn unwrap(&self, vault_id: &Uuid, params: &KdfParams, wrapped: &[u8]) -> Result<VaultKey, CryptoError> {
        if wrapped.len() != WRAPPED_KEY_LEN {
            return Err(CryptoError::MalformedEnvelope);
        }
        let plaintext = envelope::open(&self.0, &Self::wrap_aad(vault_id, params), wrapped)?;
        let bytes: [u8; KEY_LEN] = plaintext
            .as_slice()
            .try_into()
            .map_err(|_| CryptoError::DecryptionFailed)?;
        Ok(VaultKey(bytes))
    }
}

/// The vault data-encryption key (DEK).
#[derive(Zeroize, ZeroizeOnDrop)]
pub struct VaultKey([u8; KEY_LEN]);

impl VaultKey {
    /// Generate a fresh random vault key.
    pub fn generate() -> Result<Self, CryptoError> {
        Ok(Self(rng::bytes::<KEY_LEN>()?))
    }

    #[cfg(test)]
    pub(crate) const fn from_bytes(bytes: [u8; KEY_LEN]) -> Self {
        Self(bytes)
    }

    fn seal_padded(&self, aad: &[u8], plaintext: &[u8], max_len: usize) -> Result<Vec<u8>, CryptoError> {
        let padded = Zeroizing::new(padding::pad(plaintext));
        if padded.len() + MIN_LEN > max_len {
            return Err(CryptoError::PlaintextTooLarge);
        }
        envelope::seal(&self.0, aad, &padded)
    }

    fn open_padded(&self, aad: &[u8], envelope: &[u8], max_len: usize) -> Result<Zeroizing<Vec<u8>>, CryptoError> {
        if envelope.len() > max_len {
            return Err(CryptoError::MalformedEnvelope);
        }
        let mut padded = envelope::open(&self.0, aad, envelope)?;
        let taken = core::mem::take(&mut *padded);
        padding::unpad(taken).map(Zeroizing::new)
    }

    /// Encrypt a serialised item payload bound to `(vault_id, item_id)`.
    pub fn encrypt_item(&self, vault_id: &Uuid, item_id: &Uuid, plaintext: &[u8]) -> Result<Vec<u8>, CryptoError> {
        self.seal_padded(
            &aad::build(CONTEXT_ITEM, &[vault_id, item_id]),
            plaintext,
            MAX_ITEM_ENVELOPE_LEN,
        )
    }

    /// Decrypt an item envelope bound to `(vault_id, item_id)`.
    pub fn decrypt_item(
        &self,
        vault_id: &Uuid,
        item_id: &Uuid,
        envelope: &[u8],
    ) -> Result<Zeroizing<Vec<u8>>, CryptoError> {
        self.open_padded(
            &aad::build(CONTEXT_ITEM, &[vault_id, item_id]),
            envelope,
            MAX_ITEM_ENVELOPE_LEN,
        )
    }

    /// Encrypt a serialised folder payload bound to `(vault_id, folder_id)`.
    pub fn encrypt_folder(&self, vault_id: &Uuid, folder_id: &Uuid, plaintext: &[u8]) -> Result<Vec<u8>, CryptoError> {
        self.seal_padded(
            &aad::build(CONTEXT_FOLDER, &[vault_id, folder_id]),
            plaintext,
            MAX_FOLDER_ENVELOPE_LEN,
        )
    }

    /// Decrypt a folder envelope bound to `(vault_id, folder_id)`.
    pub fn decrypt_folder(
        &self,
        vault_id: &Uuid,
        folder_id: &Uuid,
        envelope: &[u8],
    ) -> Result<Zeroizing<Vec<u8>>, CryptoError> {
        self.open_padded(
            &aad::build(CONTEXT_FOLDER, &[vault_id, folder_id]),
            envelope,
            MAX_FOLDER_ENVELOPE_LEN,
        )
    }

    #[cfg(test)]
    pub(crate) fn encrypt_item_with_nonce(
        &self,
        vault_id: &Uuid,
        item_id: &Uuid,
        plaintext: &[u8],
        nonce: &[u8; envelope::NONCE_LEN],
    ) -> Result<Vec<u8>, CryptoError> {
        let padded = padding::pad(plaintext);
        envelope::seal_with_nonce(&self.0, nonce, &aad::build(CONTEXT_ITEM, &[vault_id, item_id]), &padded)
    }
}

/// Parse a 16-byte UUID from a slice.
pub fn uuid_from_slice(bytes: &[u8]) -> Result<Uuid, CryptoError> {
    bytes.try_into().map_err(|_| CryptoError::InvalidLength)
}

#[cfg(test)]
mod tests {
    use super::*;

    const VAULT: Uuid = [1; 16];
    const OTHER_VAULT: Uuid = [2; 16];
    const ITEM: Uuid = [3; 16];
    const OTHER_ITEM: Uuid = [4; 16];

    fn params() -> KdfParams {
        KdfParams::new(kdf::MIN_MEMORY_KIB, kdf::MIN_ITERATIONS, 1, &[5; 16]).unwrap()
    }

    #[test]
    fn wrap_unwrap_roundtrip() {
        let p = params();
        let kek = Kek::derive(b"master password", &p).unwrap();
        let dek = VaultKey::generate().unwrap();
        let wrapped = kek.wrap(&VAULT, &p, &dek).unwrap();
        assert_eq!(wrapped.len(), WRAPPED_KEY_LEN);
        let unwrapped = kek.unwrap(&VAULT, &p, &wrapped).unwrap();
        assert_eq!(unwrapped.0, dek.0);
    }

    #[test]
    fn wrong_password_or_binding_fails() {
        let p = params();
        let kek = Kek::derive(b"master password", &p).unwrap();
        let dek = VaultKey::generate().unwrap();
        let wrapped = kek.wrap(&VAULT, &p, &dek).unwrap();

        let wrong = Kek::derive(b"master passwore", &p).unwrap();
        assert_eq!(
            wrong.unwrap(&VAULT, &p, &wrapped).err(),
            Some(CryptoError::DecryptionFailed)
        );
        assert_eq!(
            kek.unwrap(&OTHER_VAULT, &p, &wrapped).err(),
            Some(CryptoError::DecryptionFailed)
        );

        // Tampered KDF parameters (e.g. a server "downgrade") break the AAD.
        let downgraded = KdfParams::new(kdf::MIN_MEMORY_KIB, 3, 1, &[5; 16]).unwrap();
        assert_eq!(
            kek.unwrap(&VAULT, &downgraded, &wrapped).err(),
            Some(CryptoError::DecryptionFailed)
        );
        assert_eq!(
            kek.unwrap(&VAULT, &p, &wrapped[..73]).err(),
            Some(CryptoError::MalformedEnvelope)
        );
    }

    #[test]
    fn item_binding() {
        let dek = VaultKey::generate().unwrap();
        let env = dek.encrypt_item(&VAULT, &ITEM, b"{\"a\":1}").unwrap();
        assert_eq!(env.len() % 64, (MIN_LEN) % 64, "padded to 64-byte blocks");
        assert_eq!(dek.decrypt_item(&VAULT, &ITEM, &env).unwrap().as_slice(), b"{\"a\":1}");
        assert!(dek.decrypt_item(&VAULT, &OTHER_ITEM, &env).is_err());
        assert!(dek.decrypt_item(&OTHER_VAULT, &ITEM, &env).is_err());
        // An item ciphertext is not a valid folder ciphertext, even with the same id.
        assert!(dek.decrypt_folder(&VAULT, &ITEM, &env).is_err());
        assert!(VaultKey::generate().unwrap().decrypt_item(&VAULT, &ITEM, &env).is_err());
    }

    #[test]
    fn size_limits() {
        let dek = VaultKey::generate().unwrap();
        let max_plain = MAX_ITEM_ENVELOPE_LEN - MIN_LEN - 64;
        assert!(dek.encrypt_item(&VAULT, &ITEM, &vec![b'a'; max_plain]).is_ok());
        assert_eq!(
            dek.encrypt_item(&VAULT, &ITEM, &vec![b'a'; MAX_ITEM_ENVELOPE_LEN])
                .err(),
            Some(CryptoError::PlaintextTooLarge)
        );
        assert_eq!(
            dek.encrypt_folder(&VAULT, &ITEM, &[b'a'; MAX_FOLDER_ENVELOPE_LEN])
                .err(),
            Some(CryptoError::PlaintextTooLarge)
        );
        assert!(
            dek.decrypt_item(&VAULT, &ITEM, &vec![1u8; MAX_ITEM_ENVELOPE_LEN + 1])
                .is_err()
        );
    }
}
