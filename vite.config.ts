import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vitest/config';
import { playwright } from '@vitest/browser-playwright';
import adapter from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';

// Backend used by `bun run dev` (requests to /api are proxied so the webapp and
// API share one origin, exactly like the production Caddy setup).
const apiTarget = process.env.CACHEPASS_API_URL ?? 'http://127.0.0.1:8080';

export default defineConfig({
	plugins: [
		tailwindcss(),
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},
			// Static single-page app: no Node server, every route is served by the
			// fallback page and rendered in the browser.
			adapter: adapter({ fallback: '200.html', precompress: false }),
			csp: {
				mode: 'hash',
				directives: {
					'default-src': ['none'],
					// 'wasm-unsafe-eval' permits compiling the crypto engine without
					// allowing JavaScript eval.
					'script-src': ['self', 'wasm-unsafe-eval'],
					'worker-src': ['self'],
					'style-src': ['self', 'unsafe-inline'],
					'img-src': ['self', 'data:'],
					'font-src': ['self'],
					'connect-src': ['self'],
					'manifest-src': ['self'],
					'base-uri': ['none'],
					'form-action': ['self'],
					'object-src': ['none']
				}
			}
		})
	],
	server: {
		proxy: { '/api': { target: apiTarget, changeOrigin: false } }
	},
	preview: {
		proxy: { '/api': { target: apiTarget, changeOrigin: false } }
	},
	worker: { format: 'es' },
	test: {
		expect: { requireAssertions: true },
		projects: [
			{
				extends: './vite.config.ts',
				test: {
					name: 'client',
					browser: {
						enabled: true,
						provider: playwright(),
						instances: [{ browser: 'chromium', headless: true }]
					},
					include: ['src/**/*.svelte.{test,spec}.{js,ts}', 'src/**/*.browser.{test,spec}.{js,ts}'],
					exclude: ['src/lib/server/**']
				}
			},
			{
				extends: './vite.config.ts',
				test: {
					name: 'server',
					environment: 'node',
					include: ['src/**/*.{test,spec}.{js,ts}'],
					exclude: ['src/**/*.svelte.{test,spec}.{js,ts}', 'src/**/*.browser.{test,spec}.{js,ts}']
				}
			}
		]
	}
});
