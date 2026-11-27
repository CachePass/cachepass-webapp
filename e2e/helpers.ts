import { expect, type Page } from '@playwright/test';

export const MAILPIT = process.env.MAILPIT_URL ?? 'http://127.0.0.1:58025';
export const API = process.env.CACHEPASS_API_URL ?? 'http://127.0.0.1:8080';

interface MailSummary {
	ID: string;
	To: { Address: string }[];
	Subject: string;
}

/** Poll Mailpit for the newest message to `to` with a token link and return the link path+fragment. */
export async function emailLink(to: string, subjectIncludes: string): Promise<string> {
	for (let i = 0; i < 40; i++) {
		const res = await fetch(`${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:${to}`)}`);
		const { messages } = (await res.json()) as { messages: MailSummary[] };
		const hit = messages.find((m) => m.Subject.includes(subjectIncludes));
		if (hit) {
			const msg = (await (await fetch(`${MAILPIT}/api/v1/message/${hit.ID}`)).json()) as {
				Text: string;
			};
			const url = /https?:\/\/\S+#token=[A-Za-z0-9_-]{43}/.exec(msg.Text)?.[0];
			if (url) {
				const parsed = new URL(url);
				return parsed.pathname + parsed.hash;
			}
		}
		await new Promise((r) => setTimeout(r, 250));
	}
	throw new Error(`no "${subjectIncludes}" email for ${to}`);
}

export function uniqueEmail(prefix: string): string {
	return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.test`;
}

/** Records every request body sent to the API so tests can assert what the server saw. */
export function recordApiTraffic(page: Page): string[] {
	const bodies: string[] = [];
	page.on('request', (req) => {
		if (new URL(req.url()).pathname.startsWith('/api/'))
			bodies.push(`${req.method()} ${req.url()}\n${req.postData() ?? ''}`);
	});
	return bodies;
}

/** Collect console errors, ignoring the browser's generic log line for expected 4xx API answers. */
export function recordConsoleErrors(page: Page): string[] {
	const errors: string[] = [];
	page.on('console', (msg) => {
		if (
			msg.type() === 'error' &&
			!/Failed to load resource: the server responded with a status of 40[13]/.test(msg.text())
		) {
			errors.push(msg.text());
		}
	});
	page.on('pageerror', (err) => errors.push(err.message));
	return errors;
}

export async function register(
	page: Page,
	email: string,
	accountPassword: string,
	masterPassword: string
) {
	await page.goto('/register');
	await page.getByLabel('Email').fill(email);
	await page.getByLabel('Account password', { exact: true }).fill(accountPassword);
	await page.getByLabel('Confirm account password').fill(accountPassword);
	await page.getByLabel('Master password', { exact: true }).fill(masterPassword);
	await page.getByLabel('Confirm master password').fill(masterPassword);
	await page.getByLabel('I understand my master password cannot be recovered.').check();
	await page.getByRole('button', { name: 'Create account' }).click();
	await expect(page.getByRole('heading', { name: 'Check your email' })).toBeVisible({
		timeout: 20_000
	});
}

export async function verifyAndLogin(page: Page, email: string, accountPassword: string) {
	await page.goto(await emailLink(email, 'Verify'));
	await expect(page.getByText('Your email address is verified')).toBeVisible();
	await page.goto('/login');
	await page.getByLabel('Email').fill(email);
	await page.getByLabel('Account password').fill(accountPassword);
	await page.getByRole('button', { name: 'Sign in' }).click();
	await expect(page).toHaveURL(/\/unlock/);
}

export async function unlock(page: Page, masterPassword: string) {
	await page.getByLabel('Master password').fill(masterPassword);
	await page.getByRole('button', { name: 'Unlock' }).click();
	await expect(page).toHaveURL(/\/vault/, { timeout: 20_000 });
}
