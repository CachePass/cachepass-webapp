import { page } from 'vitest/browser';
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import PasswordStrength from './PasswordStrength.svelte';

describe('PasswordStrength', () => {
	it('labels weak and strong passwords and gives feedback', async () => {
		const screen = await render(PasswordStrength, { password: 'password' });
		await expect.element(page.getByText('Very weak')).toBeVisible();
		await expect.element(page.getByText('This is a commonly used password.')).toBeVisible();

		await screen.rerender({ password: 'xK9#mQ2$vL7@pR4!' });
		await expect.element(page.getByText('Very strong')).toBeVisible();
	});

	it('renders nothing but the meter for an empty value', async () => {
		await render(PasswordStrength, { password: '' });
		await expect.element(page.getByText('Very weak')).not.toBeInTheDocument();
	});
});
