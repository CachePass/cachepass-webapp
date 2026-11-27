//! Associated-data construction (spec §5): an unambiguous, length-prefixed
//! encoding of the envelope header, a context string and a list of fields.

use crate::envelope::{ALGORITHM_XCHACHA20POLY1305, VERSION_1};

/// Context for the wrapped vault key.
pub const CONTEXT_VAULT_KEY: &[u8] = b"cachepass/v1/vault-key";
/// Context for vault items.
pub const CONTEXT_ITEM: &[u8] = b"cachepass/v1/item";
/// Context for folders.
pub const CONTEXT_FOLDER: &[u8] = b"cachepass/v1/folder";

fn push_lp(out: &mut Vec<u8>, field: &[u8]) {
    // Every field we encode is far below 4 GiB; saturate defensively rather
    // than truncate silently.
    let len = u32::try_from(field.len()).unwrap_or(u32::MAX);
    out.extend_from_slice(&len.to_be_bytes());
    out.extend_from_slice(field);
}

/// Build `version ‖ algorithm ‖ lp(context) ‖ lp(field)…`.
pub fn build(context: &[u8], fields: &[&[u8]]) -> Vec<u8> {
    let capacity = 2 + 4 + context.len() + fields.iter().map(|f| 4 + f.len()).sum::<usize>();
    let mut out = Vec::with_capacity(capacity);
    out.push(VERSION_1);
    out.push(ALGORITHM_XCHACHA20POLY1305);
    push_lp(&mut out, context);
    for field in fields {
        push_lp(&mut out, field);
    }
    out
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn encoding_is_unambiguous() {
        // ("ab", "c") and ("a", "bc") must differ.
        assert_ne!(build(b"x", &[b"ab", b"c"]), build(b"x", &[b"a", b"bc"]));
        assert_ne!(build(CONTEXT_ITEM, &[&[0; 16]]), build(CONTEXT_FOLDER, &[&[0; 16]]));
    }

    #[test]
    fn layout_matches_spec() {
        let aad = build(b"ctx", &[&[0xAA, 0xBB]]);
        assert_eq!(aad, vec![1, 1, 0, 0, 0, 3, b'c', b't', b'x', 0, 0, 0, 2, 0xAA, 0xBB]);
    }
}
