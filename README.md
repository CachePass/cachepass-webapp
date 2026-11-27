# CachePass Webapp

The CachePass password manager client: a static SvelteKit single-page app with a
Rust → WebAssembly crypto engine. **All vault encryption and decryption happens
here, in the browser.** The server only ever receives ciphertext.

> Status: pre-1.0, **not independently audited**. See the security notes below
> and `docs/` in the CachePass project for the full design.

## What it does

- Account sign-in (email + account password, optional TOTP 2FA) using HttpOnly session cookies
- Vault unlock with a separate **master password** that never leaves the device
- Logins, secure notes, cards, identities and SSH keys; folders, favourites, trash/restore
- Local search, filtering and sorting over decrypted data (secrets are never indexed)
- Live TOTP codes, password/passphrase generator (CSPRNG, EFF wordlist), strength meter
- Auto-lock on inactivity, optional lock-on-hide, clipboard auto-clear
- Master password change (re-wrap), account password change, 2FA setup, session/device management, activity log
- Command palette (⌘/Ctrl K), keyboard shortcuts, light/dark themes, responsive layout

## Architecture

```
crypto/                 Rust crate (Argon2id, HKDF-SHA-256, XChaCha20-Poly1305) → WASM
src/lib/crypto/         WASM bindings (generated, committed), worker, typed engine facade
  core.ts               spec implementation wrapper (runs inside the worker)
  worker.ts / engine.ts the vault key lives only in the worker's WASM memory
src/lib/api/            fetch client (CSRF, uniform errors) + Zod mirrors of openapi.json
src/lib/schemas/        encrypted item/folder payload schemas (Zod)
src/lib/stores/         session, vault (decrypted, memory only), settings (non-sensitive), ui
src/lib/features/       authentication, vault (search, TOTP, clipboard), generator, security
src/lib/components/     ui/ (shadcn-svelte), layout/, vault/, auth/, shared/
src/routes/(auth)/      login, register, verify-email, forgot/reset-password, unlock
src/routes/(app)/       vault, favorites, trash, folders, generator, security, settings
```

Key handling: the master password is NFC-normalised and passed to the worker; the
worker derives the KEK with Argon2id + HKDF, unwraps the vault key into a WASM-held
handle and zeroizes the KEK. Locking terminates the worker, discarding its memory.
Nothing decrypted is written to `localStorage`, `sessionStorage`, IndexedDB,
cookies or URLs; only non-sensitive preferences (theme, auto-lock minutes,
clipboard timeout, sort order) are persisted.

## Requirements

- [Bun](https://bun.sh) ≥ 1.4
- Only to rebuild the WASM engine: Rust stable with the `wasm32-unknown-unknown`
  target and `wasm-bindgen-cli 0.2.130` (`cargo install wasm-bindgen-cli --version 0.2.130 --locked`)
- A running `cachepass-backend` for anything beyond unit tests

## Development

```sh
bun install
bun run dev                 # http://localhost:5173, proxies /api → http://127.0.0.1:8080
CACHEPASS_API_URL=http://127.0.0.1:9000 bun run dev   # different backend
```

Start the backend (see its README) with `CACHEPASS_PUBLIC_URL=http://localhost:5173`.
The webapp and API must share one origin (the dev/preview proxy and the production
Caddy setup both do this) so cookies can be `SameSite=Strict`.

| Command               | Purpose                                                                                       |
| --------------------- | --------------------------------------------------------------------------------------------- |
| `bun run check`       | svelte-check + TypeScript (strict)                                                            |
| `bun run lint`        | Prettier + ESLint (type-aware)                                                                |
| `bun run test`        | Unit, component and WASM crypto tests (Vitest; component/WASM tests run in headless Chromium) |
| `bun run test:e2e`    | Playwright end-to-end tests against a real backend (see below)                                |
| `bun run test:crypto` | Rust unit tests and spec vectors of the crypto crate                                          |
| `bun run build`       | Production build → `build/` (static files, `200.html` SPA fallback)                           |
| `bun run build:wasm`  | Rebuild `src/lib/crypto/wasm/` from `crypto/`                                                 |
| `bun run wasm:verify` | Rebuild and fail if the committed WASM differs                                                |

### Crypto engine

`crypto/` is a standalone Cargo crate (its own workspace; never shared with the
backend). Its output in `src/lib/crypto/wasm/` is committed so the webapp builds
with Bun alone. After changing `crypto/`, run `bun run build:wasm`, `bun run
test:crypto` and `bun run test`, and commit the regenerated files. CI should run
`bun run wasm:verify`.

Cross-implementation check: `src/lib/crypto/core.browser.spec.ts` recomputes the
specification's test vectors with `@noble/hashes` and `@noble/ciphers` (test-only
dependencies) and checks that the WASM engine matches them byte for byte.

### End-to-end tests

1. Start the backend's dev services: `docker compose -f docker-compose.dev.yml up -d` (in `cachepass-backend`).
2. Run the backend with `CACHEPASS_PUBLIC_URL=http://localhost:4173`, SMTP pointed
   at Mailpit (`CACHEPASS_SMTP_HOST=127.0.0.1 CACHEPASS_SMTP_PORT=51025 CACHEPASS_SMTP_TLS=none`)
   and, for repeated runs, `CACHEPASS_RATE_LIMIT_ENABLED=false`.
3. `bun run test:e2e` builds the app, serves it on :4173 and drives Chromium through
   registration, email verification (read from Mailpit), unlock, CRUD, search,
   folders, trash, locking, master password change and account password reset. It
   also records every API request and asserts that the master password and item
   plaintext never appear in them.

## Deployment

The production image is a static file server (Caddy, non-root, read-only rootfs):

```sh
docker build -t cachepass-webapp:local .
```

It listens on `:8080` without TLS and is meant to sit behind the reverse proxy in
`cachepass-backend/docker-compose.yml`, which serves `/` from this container and
`/api/*` from the API on the same origin.

Security headers: the SvelteKit build emits a hash-based CSP `<meta>` tag
(`default-src 'none'; script-src 'self' 'wasm-unsafe-eval' <hash>; connect-src 'self'; …`).
`deploy/Caddyfile` adds `frame-ancestors 'none'`, `X-Frame-Options`, `nosniff`,
`Referrer-Policy: no-referrer`, `Permissions-Policy` and cache headers.

## Security notes and limitations

- **You must trust the server that delivers this code.** A malicious or
  compromised server, build or dependency can ship JavaScript that captures the
  master password. Zero-knowledge storage does not protect against that.
- A compromised browser, extension or OS defeats client-side protections.
- Decrypted values exist as JavaScript strings while unlocked and cannot be
  reliably wiped from JS memory; CachePass drops all references on lock.
- Clipboard clearing is best effort (browsers only allow it while the page has focus).
- The strength meter is a heuristic estimate, not a guarantee.

## License

AGPL-3.0-only — see [LICENSE](LICENSE). The EFF Large Wordlist
(`src/lib/features/generator/wordlist.ts`) is © Electronic Frontier Foundation,
CC BY 3.0 US.
