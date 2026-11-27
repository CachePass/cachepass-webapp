# syntax=docker/dockerfile:1.7
# CachePass webapp — static SPA served by Caddy as a non-root user on :8080.
# TLS is terminated by the reverse proxy in front (see cachepass-backend/deploy).

FROM oven/bun:1.4-alpine AS build
WORKDIR /app
COPY package.json bun.lock ./
# --ignore-scripts: dependency install scripts never run during the image build.
RUN bun install --frozen-lockfile --ignore-scripts
COPY . .
# The WASM engine is committed (src/lib/crypto/wasm), so no Rust toolchain is needed here.
RUN bun run build

FROM caddy:2.10-alpine
ENV XDG_CONFIG_HOME=/tmp/caddy-config XDG_DATA_HOME=/tmp/caddy-data
COPY deploy/Caddyfile /etc/caddy/Caddyfile
COPY --from=build /app/build /srv
USER 65532:65532
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s CMD wget -q --spider http://127.0.0.1:8080/ || exit 1
CMD ["caddy", "run", "--config", "/etc/caddy/Caddyfile", "--adapter", "caddyfile"]
