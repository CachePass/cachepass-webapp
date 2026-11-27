//! CachePass client-side cryptography.
//!
//! Implements the v1 specification in `docs/CRYPTOGRAPHY.md`: Argon2id and
//! HKDF-SHA-256 key derivation, XChaCha20-Poly1305 envelopes with
//! length-prefixed associated data, and ISO/IEC 7816-4 plaintext padding.
//! All primitives come from RustCrypto crates; nothing here implements a
//! primitive.

// Tests are expected to panic on failure.
#![cfg_attr(
    test,
    allow(clippy::unwrap_used, clippy::expect_used, clippy::indexing_slicing, clippy::panic)
)]

pub mod aad;
pub mod envelope;
pub mod error;
pub mod kdf;
pub mod keys;
pub mod padding;
mod rng;

#[cfg(target_arch = "wasm32")]
mod wasm;

#[cfg(test)]
mod vectors;

pub use error::CryptoError;
pub use kdf::KdfParams;
pub use keys::{Kek, Uuid, VaultKey};
