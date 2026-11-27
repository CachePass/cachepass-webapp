//! ISO/IEC 7816-4 padding to a fixed block size (spec §6).

use crate::error::CryptoError;

/// Padding block size in bytes.
pub const BLOCK: usize = 64;

/// Append `0x80` followed by zero bytes up to the next multiple of [`BLOCK`].
/// Always adds at least one byte.
pub fn pad(data: &[u8]) -> Vec<u8> {
    let padded_len = (data.len() / BLOCK + 1) * BLOCK;
    let mut out = Vec::with_capacity(padded_len);
    out.extend_from_slice(data);
    out.push(0x80);
    out.resize(padded_len, 0);
    out
}

/// Strictly remove padding. Rejects input whose length is not a multiple of
/// [`BLOCK`], or whose trailing bytes are not `0x80 0x00*`.
pub fn unpad(mut data: Vec<u8>) -> Result<Vec<u8>, CryptoError> {
    if data.is_empty() || !data.len().is_multiple_of(BLOCK) {
        return Err(CryptoError::DecryptionFailed);
    }
    let marker = data
        .iter()
        .rposition(|&b| b != 0)
        .ok_or(CryptoError::DecryptionFailed)?;
    // The padding run is at most one block long.
    if data.get(marker) != Some(&0x80) || data.len() - marker > BLOCK {
        return Err(CryptoError::DecryptionFailed);
    }
    data.truncate(marker);
    Ok(data)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn roundtrip_various_lengths() {
        for len in [0usize, 1, 62, 63, 64, 65, 127, 128, 1000] {
            let data = vec![0xABu8; len];
            let padded = pad(&data);
            assert_eq!(padded.len() % BLOCK, 0);
            assert!(padded.len() > len);
            assert_eq!(unpad(padded).ok(), Some(data));
        }
    }

    #[test]
    fn data_ending_in_zero_bytes_survives() {
        let data = vec![1, 0, 0, 0];
        assert_eq!(unpad(pad(&data)).ok(), Some(data));
    }

    #[test]
    fn rejects_malformed_padding() {
        assert!(unpad(vec![]).is_err());
        assert!(unpad(vec![0u8; 64]).is_err(), "no marker");
        assert!(unpad(vec![0x80; 63]).is_err(), "wrong length");
        let mut bad = vec![0u8; 64];
        bad[10] = 0x81;
        assert!(unpad(bad).is_err(), "wrong marker byte");
        let mut long = vec![0u8; 192];
        long[0] = 0x80;
        assert!(unpad(long).is_err(), "padding longer than a block");
    }
}
