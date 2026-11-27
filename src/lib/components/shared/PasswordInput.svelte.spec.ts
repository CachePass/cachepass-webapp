import { page } from 'vitest/browser';
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import PasswordInput from './PasswordInput.svelte';

describe('PasswordInput', () => {
	it('masks by default and toggles visibility accessibly', async () => {
		await render(PasswordInput, { value: 'hunter2-secret', 'aria-label': 'Secret' });
		const input = page.getByLabelText('Secret');
		await expect.element(input).toHaveAttribute('type', 'password');
		await expect.element(input).toHaveAttribute('spellcheck', 'false');

		const toggle = page.getByRole('button', { name: 'Show password' });
		await expect.element(toggle).toHaveAttribute('aria-pressed', 'false');
		await toggle.click();
		await expect.element(input).toHaveAttribute('type', 'text');
		await expect
			.element(page.getByRole('button', { name: 'Hide password' }))
			.toHaveAttribute('aria-pressed', 'true');
	});
});
