//! Fixed test vectors (spec §9). Fixed keys and nonces exist ONLY here.

use argon2::{Algorithm, Argon2, Params, Version};

use crate::kdf::{self, KdfParams};
use crate::keys::{Kek, VaultKey};

const VAULT_ID: [u8; 16] = hex_literal(b"0f1e2d3c4b5a69788796a5b4c3d2e1f0");
const ITEM_ID: [u8; 16] = hex_literal(b"11111111222243338444555555555555");
const PASSWORD: &[u8] = b"correct horse battery staple";
const SALT: [u8; 16] = hex_literal(b"000102030405060708090a0b0c0d0e0f");
const DEK: [u8; 32] = hex_literal(b"202122232425262728292a2b2c2d2e2f303132333435363738393a3b3c3d3e3f");
const NONCE_WRAP: [u8; 24] = hex_literal(b"404142434445464748494a4b4c4d4e4f5051525354555657");
const NONCE_ITEM: [u8; 24] = hex_literal(b"606162636465666768696a6b6c6d6e6f7071727374757677");
const ITEM_JSON: &[u8] = br#"{"schema":1,"type":"note","name":"Test"}"#;

const fn hex_literal<const N: usize>(s: &[u8]) -> [u8; N] {
    const fn nibble(c: u8) -> u8 {
        match c {
            b'0'..=b'9' => c - b'0',
            b'a'..=b'f' => c - b'a' + 10,
            _ => panic!("invalid hex"),
        }
    }
    let mut out = [0u8; N];
    let mut i = 0;
    while i < N {
        out[i] = (nibble(s[2 * i]) << 4) | nibble(s[2 * i + 1]);
        i += 1;
    }
    out
}

fn params() -> KdfParams {
    KdfParams::new(19_456, 2, 1, &SALT).unwrap()
}

fn ikm() -> [u8; 32] {
    let p = Params::new(19_456, 2, 1, Some(32)).unwrap();
    let mut out = [0u8; 32];
    Argon2::new(Algorithm::Argon2id, Version::V0x13, p)
        .hash_password_into(PASSWORD, &SALT, &mut out)
        .unwrap();
    out
}

struct Outputs {
    ikm: String,
    kek: String,
    wrapped: String,
    item: String,
}

fn compute() -> Outputs {
    let p = params();
    let kek_bytes = kdf::derive_kek(PASSWORD, &p).unwrap();
    let kek = Kek::derive(PASSWORD, &p).unwrap();
    let dek = VaultKey::from_bytes(DEK);
    Outputs {
        ikm: hex::encode(ikm()),
        kek: hex::encode(*kek_bytes),
        wrapped: hex::encode(kek.wrap_with_nonce(&VAULT_ID, &p, &dek, &NONCE_WRAP).unwrap()),
        item: hex::encode(
            dek.encrypt_item_with_nonce(&VAULT_ID, &ITEM_ID, ITEM_JSON, &NONCE_ITEM)
                .unwrap(),
        ),
    }
}

const EXPECTED_IKM: &str = "818259b6310026a8e0dbac5d2e6927abcfdb07b32258fac4f61b18b80f929085";
const EXPECTED_KEK: &str = "a552e869c0e7842897ba0b8c0dbb118ef465a2ca81475c8c3cda02bcad121902";
const EXPECTED_WRAPPED: &str = "0101404142434445464748494a4b4c4d4e4f5051525354555657766b9b6de612c45b9b386b77f75a2c279cde4e71d3de75dc8539aa7d05b7ed72a49df5ff889f4db69f8362e9338e4ac2";
const EXPECTED_ITEM: &str = "0101606162636465666768696a6b6c6d6e6f707172737475767793053345ed14f6a0883ba42330d556e912ce9637078aad03420e1b945bf8e7a519b3297452c4065fc6b8276ec7b40652d6ee092f5dd26df31e40e8a56bde809019e7bbe60e1d1cce6cb0439c8dbe60cf";

#[test]
fn vectors_are_stable() {
    let o = compute();
    assert_eq!(o.ikm, EXPECTED_IKM);
    assert_eq!(o.kek, EXPECTED_KEK);
    assert_eq!(o.wrapped, EXPECTED_WRAPPED);
    assert_eq!(o.item, EXPECTED_ITEM);
}

#[test]
fn vectors_decrypt_through_public_api() {
    let p = params();
    let kek = Kek::derive(PASSWORD, &p).unwrap();
    let dek = kek
        .unwrap(&VAULT_ID, &p, &hex::decode(EXPECTED_WRAPPED).unwrap())
        .unwrap();
    let item = dek
        .decrypt_item(&VAULT_ID, &ITEM_ID, &hex::decode(EXPECTED_ITEM).unwrap())
        .unwrap();
    assert_eq!(item.as_slice(), ITEM_JSON);
}

#[test]
#[ignore = "prints vectors for docs/CRYPTOGRAPHY.md"]
fn print_vectors() {
    let o = compute();
    println!(
        "ikm     = {}\nkek     = {}\nwrapped = {}\nitem    = {}",
        o.ikm, o.kek, o.wrapped, o.item
    );
}
