#!/usr/bin/env bash
# Build the Rust crypto engine to WebAssembly and generate JS bindings.
# Output (src/lib/crypto/wasm/) is committed so the webapp can be installed,
# tested and built with Bun alone. Run this after changing crypto/ and commit
# the result; CI should run `bun run wasm:verify` to check it is up to date.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT="$ROOT/src/lib/crypto/wasm"
REQUIRED_BINDGEN="0.2.130"
export PATH="$PATH:${CARGO_HOME:-$HOME/.cargo}/bin"

command -v cargo >/dev/null || { echo "cargo not found (install Rust via rustup)" >&2; exit 1; }
command -v wasm-bindgen >/dev/null || {
  echo "wasm-bindgen not found: cargo install wasm-bindgen-cli --version $REQUIRED_BINDGEN --locked" >&2; exit 1; }
actual="$(wasm-bindgen --version | awk '{print $2}')"
[ "$actual" = "$REQUIRED_BINDGEN" ] || {
  echo "wasm-bindgen $actual found, $REQUIRED_BINDGEN required (must match crypto/Cargo.toml)" >&2; exit 1; }

cargo build --manifest-path "$ROOT/crypto/Cargo.toml" --release --target wasm32-unknown-unknown --locked
rm -rf "$OUT"
wasm-bindgen --target web --out-dir "$OUT" --out-name cachepass_crypto \
  "$ROOT/crypto/target/wasm32-unknown-unknown/release/cachepass_crypto.wasm"
# Generated code: exclude from type checking and linting (it is verified by tests).
for f in "$OUT"/*.js; do
  printf '// @ts-nocheck\n%s\n' "$(cat "$f")" > "$f"
done
echo "WASM engine written to $OUT ($(du -h "$OUT/cachepass_crypto_bg.wasm" | cut -f1))"
