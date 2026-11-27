# cachepass-webapp — instructions for Claude Code

Static SvelteKit 3 SPA (Svelte 5 runes, strict TS, Tailwind v4, shadcn-svelte, Bun)
plus `crypto/`, a Rust crate compiled to WASM. This repo owns ALL vault cryptography.

## Boundaries

- Independent repo: never import from `cachepass-backend` or `cachepass-website`.
  The API contract is `cachepass-backend/openapi.json`; mirror changes in
  `src/lib/api/schemas.ts` + `endpoints.ts`.
- `crypto/` is its own Cargo workspace. Never add it to another workspace.
- Crypto format = `docs/CRYPTOGRAPHY.md` (workspace root symlink → `cachepass-docs` repo). Changing the format needs a
  version bump, new vectors, and updates to the backend's envelope validator.

## Security rules (non-negotiable)

- Master password, vault key and plaintext never go to the API, logs, analytics,
  URLs, or browser storage. Only non-sensitive prefs may use `localStorage`.
- All crypto via the WASM engine (worker). No hand-rolled primitives, no WebCrypto
  substitutes for vault encryption, no fixed nonces outside tests.
- Render decrypted data as text only — never `{@html}`. Keep CSP strict (no
  inline scripts/handlers, no third-party origins, no `'unsafe-eval'`).
- Clipboard only on explicit user action. Error messages must not include secrets.
- Internal links/`goto` use `resolve()` from `$app/paths` (Kit 3 pathnames have no
  leading slash, e.g. `resolve('vault?type=login')`). External links: `rel="external noopener noreferrer"`.

## Conventions

- Imports use `#lib/...` with explicit `.js` extensions for TS modules.
- Feature logic in `src/lib/features/*` (pure, unit-tested); components stay small.
- Vendored shadcn code lives in `src/lib/components/ui/` (regenerate with the CLI).

## Commands (all must pass before committing)

`bun run check` · `bun run lint` · `bun run test` · `bun run build`
After touching `crypto/`: `bun run test:crypto && bun run build:wasm` and commit `src/lib/crypto/wasm/`.
E2E (needs backend + Mailpit, see README): `bun run test:e2e`.

## Git

Conventional commits, focused changes, never force-push, never commit `.env` or secrets.
