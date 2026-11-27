import { expect, test } from '@playwright/test';
import {
	emailLink,
	recordApiTraffic,
	recordConsoleErrors,
	register,
	uniqueEmail,
	unlock,
	verifyAndLogin
} from './helpers';

const ACCOUNT_PASSWORD = 'account password e2e 1';
const MASTER_PASSWORD = 'master passphrase orbit cactus 42';

test.describe.configure({ mode: 'serial' });

test('full zero-knowledge vault lifecycle', async ({ page }) => {
	const email = uniqueEmail('lifecycle');
	const traffic = recordApiTraffic(page);
	const consoleErrors = recordConsoleErrors(page);

	// Registration: master password must differ from the account password.
	await page.goto('/register');
	await page.getByLabel('Email').fill(email);
	await page.getByLabel('Account password', { exact: true }).fill(ACCOUNT_PASSWORD);
	await page.getByLabel('Confirm account password').fill(ACCOUNT_PASSWORD);
	await page.getByLabel('Master password', { exact: true }).fill(ACCOUNT_PASSWORD);
	await page.getByLabel('Confirm master password').fill(ACCOUNT_PASSWORD);
	await page.getByLabel('I understand my master password cannot be recovered.').check();
	await page.getByRole('button', { name: 'Create account' }).click();
	await expect(page.getByText(/must be different from your account password/i)).toBeVisible();

	await register(page, email, ACCOUNT_PASSWORD, MASTER_PASSWORD);

	// Unverified accounts cannot sign in.
	await page.goto('/login');
	await page.getByLabel('Email').fill(email);
	await page.getByLabel('Account password').fill(ACCOUNT_PASSWORD);
	await page.getByRole('button', { name: 'Sign in' }).click();
	await expect(page.getByText('Verify your email address before signing in.')).toBeVisible();

	await verifyAndLogin(page, email, ACCOUNT_PASSWORD);
	// The token was removed from the address bar.
	expect(page.url()).not.toContain('token=');

	// Wrong master password is rejected locally.
	await page.getByLabel('Master password').fill('not my master password');
	await page.getByRole('button', { name: 'Unlock' }).click();
	await expect(page.getByText('The master password is incorrect.')).toBeVisible({
		timeout: 20_000
	});
	await unlock(page, MASTER_PASSWORD);
	await expect(page.getByText('Your vault is empty')).toBeVisible();

	// Create a login with the keyboard shortcut.
	await page.keyboard.press('n');
	const editor = page.getByRole('dialog');
	await expect(editor.getByRole('heading', { name: 'New login' })).toBeVisible();
	await editor.getByLabel('Name', { exact: true }).fill('Example Mail');
	await editor.getByLabel('Username or email').fill('octo-e2e-user');
	await editor.getByLabel('Password', { exact: true }).fill('Hx7#pL2!qZ9$wR4m');
	await editor.getByLabel('Authenticator key (TOTP)').fill('JBSWY3DPEHPK3PXP');
	await editor.getByRole('textbox', { name: 'Website 1' }).fill('https://mail.example.com');
	await editor.getByRole('button', { name: 'Save' }).click();
	await expect(editor).toBeHidden();

	const detail = page.getByRole('article', { name: 'Example Mail' });
	await expect(detail).toBeVisible();
	await expect(detail.getByText('octo-e2e-user')).toBeVisible();
	await expect(detail).toContainText(/One-time code\s*\d{3}\s+\d{3}/); // live TOTP code
	await expect(detail.getByText('Hx7#pL2!qZ9$wR4m')).toBeHidden(); // masked by default
	await detail.getByRole('button', { name: 'Show password' }).click();
	await expect(detail.getByText('Hx7#pL2!qZ9$wR4m')).toBeVisible();

	// Copy uses the clipboard only on explicit action.
	await detail.getByRole('button', { name: 'Copy username' }).click();
	expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('octo-e2e-user');

	// A secure note, favourited.
	await page.getByRole('button', { name: 'New' }).click();
	await page.getByRole('menuitem', { name: 'Secure note' }).click();
	await editor.getByLabel('Name', { exact: true }).fill('Recovery plan');
	await editor.getByLabel('Note').fill('Call the bank first.');
	await editor.getByText('Favorite').click();
	await editor.getByRole('button', { name: 'Save' }).click();
	await expect(editor).toBeHidden();

	// Local search.
	const search = page.getByRole('searchbox', { name: 'Search items' });
	await search.fill('exam');
	await expect(page.getByRole('option')).toHaveCount(1);
	await search.fill('octo-e2e');
	await expect(page.getByRole('option', { name: /Example Mail/ })).toBeVisible();
	await search.fill('Hx7#pL2'); // passwords are never searchable
	await expect(page.getByText('No matches')).toBeVisible();
	await search.fill('');

	// What did the server receive and store? Only ciphertext.
	const sync = await page.request.get('/api/v1/vault/sync');
	const stored = await sync.text();
	for (const secret of [
		'Example Mail',
		'octo-e2e-user',
		'Hx7#pL2!qZ9$wR4m',
		'JBSWY3DPEHPK3PXP',
		'Recovery plan',
		'Call the bank'
	]) {
		expect(stored).not.toContain(secret);
	}
	expect((JSON.parse(stored) as { items: unknown[] }).items).toHaveLength(2);

	// Favorites view.
	await page.getByRole('link', { name: /Favorites/ }).click();
	await expect(page.getByRole('option')).toHaveCount(1);
	await expect(page.getByRole('option', { name: /Recovery plan/ })).toBeVisible();

	// Trash and restore.
	await page.getByRole('option', { name: /Recovery plan/ }).click();
	await page.getByRole('button', { name: 'More actions' }).click();
	await page.getByRole('menuitem', { name: 'Move to trash' }).click();
	await page.getByRole('link', { name: /Trash/ }).click();
	await page.getByRole('option', { name: /Recovery plan/ }).click();
	await page.getByRole('button', { name: 'Restore' }).click();
	await expect(page.getByText('Item restored')).toBeVisible();

	// Folders: names are encrypted too.
	await page.getByRole('link', { name: 'Manage folders' }).click();
	await page.getByRole('button', { name: 'New folder' }).click();
	await page.getByLabel('Name', { exact: true }).fill('Work secrets');
	await page.getByRole('button', { name: 'Save' }).click();
	await expect(page.getByRole('link', { name: 'Work secrets' }).first()).toBeVisible();
	expect(await (await page.request.get('/api/v1/folders')).text()).not.toContain('Work secrets');

	// Command palette.
	await page.keyboard.press('Control+k');
	await page.getByPlaceholder('Search items or type a command…').fill('Example');
	await page.keyboard.press('Enter');
	await expect(page.getByRole('article', { name: 'Example Mail' })).toBeVisible();

	// Lock: plaintext leaves the page; unlocking restores it from ciphertext.
	await page.keyboard.press('Control+Shift+L');
	await expect(page).toHaveURL(/\/unlock/);
	await expect(page.getByText('Example Mail')).toHaveCount(0);
	await unlock(page, MASTER_PASSWORD);
	await expect(page.getByRole('option', { name: /Example Mail/ })).toBeVisible();

	// A reload keeps the session (HttpOnly cookie) but the vault starts locked.
	await page.reload();
	await expect(page).toHaveURL(/\/unlock/);
	const storage = await page.evaluate(
		() =>
			JSON.stringify({ ...localStorage }) + JSON.stringify({ ...sessionStorage }) + document.cookie
	);
	expect(storage).not.toContain('Example Mail');
	expect(storage).not.toContain(MASTER_PASSWORD);
	expect(storage).not.toContain('cachepass_session'); // HttpOnly: invisible to JS
	await unlock(page, MASTER_PASSWORD);

	// Generator.
	await page.getByRole('link', { name: 'Password generator' }).click();
	await expect(
		page.getByRole('status', { name: 'Generated value' }).or(page.getByLabel('Generated value'))
	).not.toBeEmpty();
	await expect(page.getByText(/bits of entropy/)).toBeVisible();

	// Security page: sessions and audit log.
	await page.getByRole('link', { name: 'Security' }).click();
	await expect(page.getByText('This session')).toBeVisible();
	await expect(page.getByText('Signed in', { exact: true }).first()).toBeVisible();

	// Sign out.
	await page.getByRole('link', { name: /All items/ }).click();
	await page.getByRole('button', { name: /Account/ }).click();
	await page.getByRole('menuitem', { name: 'Sign out' }).click();
	await expect(page).toHaveURL(/\/login/);
	await page.goto('/vault');
	await expect(page).toHaveURL(/\/login/);

	// The master password never appeared in any request to the API.
	expect(traffic.length).toBeGreaterThan(10);
	for (const entry of traffic) expect(entry).not.toContain(MASTER_PASSWORD);
	expect(consoleErrors).toEqual([]);
});

test('master password change re-wraps the key; account password reset keeps the vault', async ({
	page
}) => {
	const email = uniqueEmail('rotate');
	const NEW_MASTER = 'a brand new master passphrase 7';
	await register(page, email, ACCOUNT_PASSWORD, MASTER_PASSWORD);
	await verifyAndLogin(page, email, ACCOUNT_PASSWORD);
	await unlock(page, MASTER_PASSWORD);

	await page.keyboard.press('n');
	await page.getByRole('dialog').getByLabel('Name', { exact: true }).fill('Persistent item');
	await page.getByRole('dialog').getByRole('button', { name: 'Save' }).click();
	await expect(page.getByRole('article', { name: 'Persistent item' })).toBeVisible();

	await page.getByRole('link', { name: 'Security' }).click();
	await page.getByLabel('Current master password').fill(MASTER_PASSWORD);
	await page.getByLabel('New master password', { exact: true }).fill(NEW_MASTER);
	await page.getByLabel('Confirm new master password').fill(NEW_MASTER);
	await page.getByRole('button', { name: 'Change master password' }).click();
	await expect(page.getByText('Master password changed')).toBeVisible({ timeout: 20_000 });

	// Reset the ACCOUNT password by email.
	await page
		.getByRole('button', { name: /Account/ })
		.click()
		.catch(() => undefined);
	await page.goto('/forgot-password');
	await page.getByLabel('Email').fill(email);
	await page.getByRole('button', { name: 'Send reset link' }).click();
	await page.goto(await emailLink(email, 'Reset'));
	await page.getByLabel('New account password').fill('fresh account password 9');
	await page.getByLabel('Confirm new password').fill('fresh account password 9');
	await page.getByRole('button', { name: 'Set new password' }).click();
	await expect(page.getByText(/Your account password was reset/)).toBeVisible();

	await page.goto('/login');
	await page.getByLabel('Email').fill(email);
	await page.getByLabel('Account password').fill('fresh account password 9');
	await page.getByRole('button', { name: 'Sign in' }).click();
	await expect(page).toHaveURL(/\/unlock/);
	// The old master password no longer works; the new one does; data survived both changes.
	await page.getByLabel('Master password').fill(MASTER_PASSWORD);
	await page.getByRole('button', { name: 'Unlock' }).click();
	await expect(page.getByText('The master password is incorrect.')).toBeVisible({
		timeout: 20_000
	});
	await unlock(page, NEW_MASTER);
	await expect(page.getByRole('option', { name: /Persistent item/ })).toBeVisible();
});
