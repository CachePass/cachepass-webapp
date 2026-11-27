//! Error type. Variants are intentionally coarse so that callers (and the UI)
//! cannot learn *why* a decryption failed beyond "it did not authenticate".

use core::fmt;

/// Errors returned by the CachePass crypto engine.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum CryptoError {
    /// KDF parameters are outside the accepted bounds or malformed.
    InvalidKdfParams,
    /// An input had the wrong length (key, salt, id, …).
    InvalidLength,
    /// The envelope header is unknown or the envelope is truncated.
    MalformedEnvelope,
    /// AEAD verification failed or padding was invalid. For key unwrapping
    /// this almost always means "wrong master password".
    DecryptionFailed,
    /// The plaintext exceeds the maximum size for this object type.
    PlaintextTooLarge,
    /// The operating system / browser CSPRNG was unavailable.
    RandomnessUnavailable,
    /// The key derivation function failed internally (e.g. out of memory).
    KdfFailed,
}

impl CryptoError {
    /// Stable machine-readable code, surfaced to TypeScript.
    pub const fn code(self) -> &'static str {
        match self {
            Self::InvalidKdfParams => "invalid_kdf_params",
            Self::InvalidLength => "invalid_length",
            Self::MalformedEnvelope => "malformed_envelope",
            Self::DecryptionFailed => "decryption_failed",
            Self::PlaintextTooLarge => "plaintext_too_large",
            Self::RandomnessUnavailable => "randomness_unavailable",
            Self::KdfFailed => "kdf_failed",
        }
    }
}

impl fmt::Display for CryptoError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str(self.code())
    }
}

impl std::error::Error for CryptoError {}
