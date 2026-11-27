//! WebAssembly bindings consumed by `src/lib/crypto/engine.ts`.
//!
//! Design rules:
//! - Key material never crosses into JavaScript. The vault key lives in a
//!   [`VaultKeyHandle`]; JS holds only an opaque pointer and must call
//!   `free()` (done by the TS wrapper on lock).
//! - Secret inputs (master password, plaintext) are taken by value so the
//!   WASM-side copy can be zeroized before it is freed.
//! - Decrypted output is copied into a fresh JS `Uint8Array`, then the WASM
//!   copy is zeroized.
//! - Errors carry only the coarse [`CryptoError::code`].

use js_sys::Uint8Array;
use wasm_bindgen::prelude::*;
use zeroize::Zeroizing;

use crate::error::CryptoError;
use crate::kdf::{self, KdfParams};
use crate::keys::{Kek, VaultKey, uuid_from_slice};

fn js_err(e: CryptoError) -> JsError {
    JsError::new(e.code())
}

fn to_js(bytes: Zeroizing<Vec<u8>>) -> Uint8Array {
    Uint8Array::from(bytes.as_slice())
}

/// Validated Argon2id parameters + salt. Construction fails for anything
/// outside the accepted bounds, so a malicious server cannot push weak or
/// resource-exhausting parameters.
#[wasm_bindgen]
pub struct KdfConfig {
    inner: KdfParams,
}

#[wasm_bindgen]
impl KdfConfig {
    /// Validate and construct.
    #[wasm_bindgen(constructor)]
    pub fn new(memory_kib: u32, iterations: u32, parallelism: u32, salt: &[u8]) -> Result<KdfConfig, JsError> {
        KdfParams::new(memory_kib, iterations, parallelism, salt)
            .map(|inner| Self { inner })
            .map_err(js_err)
    }
}

/// KDF policy as `[default_m, min_m, max_m, default_t, min_t, max_t, default_p, min_p, max_p]`.
#[wasm_bindgen(js_name = kdfPolicy)]
pub fn kdf_policy() -> Vec<u32> {
    vec![
        kdf::DEFAULT_MEMORY_KIB,
        kdf::MIN_MEMORY_KIB,
        kdf::MAX_MEMORY_KIB,
        kdf::DEFAULT_ITERATIONS,
        kdf::MIN_ITERATIONS,
        kdf::MAX_ITERATIONS,
        kdf::DEFAULT_PARALLELISM,
        kdf::MIN_PARALLELISM,
        kdf::MAX_PARALLELISM,
    ]
}

/// Fresh random 16-byte KDF salt.
#[wasm_bindgen(js_name = generateSalt)]
pub fn generate_salt() -> Result<Vec<u8>, JsError> {
    KdfParams::generate_default().map(|p| p.salt().to_vec()).map_err(js_err)
}

/// Generate a new random vault key.
#[wasm_bindgen(js_name = generateVaultKey)]
pub fn generate_vault_key() -> Result<VaultKeyHandle, JsError> {
    VaultKey::generate()
        .map(|inner| VaultKeyHandle { inner })
        .map_err(js_err)
}

/// Derive the KEK from the master password and unwrap the vault key.
#[wasm_bindgen(js_name = unlockVaultKey)]
pub fn unlock_vault_key(
    password: Vec<u8>,
    vault_id: &[u8],
    kdf: &KdfConfig,
    wrapped_key: &[u8],
) -> Result<VaultKeyHandle, JsError> {
    let password = Zeroizing::new(password);
    let vault_id = uuid_from_slice(vault_id).map_err(js_err)?;
    let kek = Kek::derive(&password, &kdf.inner).map_err(js_err)?;
    kek.unwrap(&vault_id, &kdf.inner, wrapped_key)
        .map(|inner| VaultKeyHandle { inner })
        .map_err(js_err)
}

/// Opaque handle to an unlocked vault key held in WASM memory.
#[wasm_bindgen]
pub struct VaultKeyHandle {
    inner: VaultKey,
}

#[wasm_bindgen]
impl VaultKeyHandle {
    /// Wrap this vault key under a KEK derived from `password` (used at
    /// registration and on master password change).
    pub fn wrap(&self, password: Vec<u8>, vault_id: &[u8], kdf: &KdfConfig) -> Result<Vec<u8>, JsError> {
        let password = Zeroizing::new(password);
        let vault_id = uuid_from_slice(vault_id).map_err(js_err)?;
        let kek = Kek::derive(&password, &kdf.inner).map_err(js_err)?;
        kek.wrap(&vault_id, &kdf.inner, &self.inner).map_err(js_err)
    }

    /// Encrypt an item payload. `plaintext` is zeroized after use.
    #[wasm_bindgen(js_name = encryptItem)]
    pub fn encrypt_item(&self, vault_id: &[u8], item_id: &[u8], plaintext: Vec<u8>) -> Result<Vec<u8>, JsError> {
        let plaintext = Zeroizing::new(plaintext);
        let vault_id = uuid_from_slice(vault_id).map_err(js_err)?;
        let item_id = uuid_from_slice(item_id).map_err(js_err)?;
        self.inner.encrypt_item(&vault_id, &item_id, &plaintext).map_err(js_err)
    }

    /// Decrypt an item envelope.
    #[wasm_bindgen(js_name = decryptItem)]
    pub fn decrypt_item(&self, vault_id: &[u8], item_id: &[u8], envelope: &[u8]) -> Result<Uint8Array, JsError> {
        let vault_id = uuid_from_slice(vault_id).map_err(js_err)?;
        let item_id = uuid_from_slice(item_id).map_err(js_err)?;
        self.inner
            .decrypt_item(&vault_id, &item_id, envelope)
            .map(to_js)
            .map_err(js_err)
    }

    /// Encrypt a folder payload. `plaintext` is zeroized after use.
    #[wasm_bindgen(js_name = encryptFolder)]
    pub fn encrypt_folder(&self, vault_id: &[u8], folder_id: &[u8], plaintext: Vec<u8>) -> Result<Vec<u8>, JsError> {
        let plaintext = Zeroizing::new(plaintext);
        let vault_id = uuid_from_slice(vault_id).map_err(js_err)?;
        let folder_id = uuid_from_slice(folder_id).map_err(js_err)?;
        self.inner
            .encrypt_folder(&vault_id, &folder_id, &plaintext)
            .map_err(js_err)
    }

    /// Decrypt a folder envelope.
    #[wasm_bindgen(js_name = decryptFolder)]
    pub fn decrypt_folder(&self, vault_id: &[u8], folder_id: &[u8], envelope: &[u8]) -> Result<Uint8Array, JsError> {
        let vault_id = uuid_from_slice(vault_id).map_err(js_err)?;
        let folder_id = uuid_from_slice(folder_id).map_err(js_err)?;
        self.inner
            .decrypt_folder(&vault_id, &folder_id, envelope)
            .map(to_js)
            .map_err(js_err)
    }
}
