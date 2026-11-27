import { defineConfig, devices } from '@playwright/test';

/**
 * End-to-end tests run the production build against a REAL backend.
 * Start the backend first (see README "End-to-end tests"):
 *   CACHEPASS_PUBLIC_URL=http://localhost:4173, SMTP → Mailpit (127.0.0.1:51025)
 * Override with CACHEPASS_API_URL / MAILPIT_URL if your ports differ.
 */
export default defineConfig({
	testDir: 'e2e',
	testMatch: '**/*.e2e.ts',
	fullyParallel: false,
	workers: 1,
	timeout: 60_000,
	expect: { timeout: 10_000 },
	reporter: [['list']],
	use: {
		baseURL: 'http://localhost:4173',
		trace: 'retain-on-failure',
		permissions: ['clipboard-read', 'clipboard-write']
	},
	projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
	webServer: {
		command: 'bun run build && bun run preview --port 4173 --strictPort',
		url: 'http://localhost:4173',
		reuseExistingServer: !process.env.CI,
		timeout: 180_000
	}
});
