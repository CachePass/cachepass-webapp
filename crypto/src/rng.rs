//! CSPRNG access. On wasm32 this is `crypto.getRandomValues()`; natively it is
//! the operating system generator. There is no fallback generator.

use crate::error::CryptoError;

/// Fill `dest` with cryptographically secure random bytes.
pub fn fill(dest: &mut [u8]) -> Result<(), CryptoError> {
    getrandom::fill(dest).map_err(|_| CryptoError::RandomnessUnavailable)
}

/// Return `N` cryptographically secure random bytes.
pub fn bytes<const N: usize>() -> Result<[u8; N], CryptoError> {
    let mut out = [0u8; N];
    fill(&mut out)?;
    Ok(out)
}
