import { page } from 'vitest/browser';
import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import GeneratorPanel from '#lib/test/GeneratorHarness.svelte';

describe('GeneratorPanel', () => {
	it('generates passwords, regenerates, and hands the value to the editor', async () => {
		const onuse = vi.fn();
		await render(GeneratorPanel, { onuse });
		const output = page.getByLabelText('Generated value');
		const first = output.element().textContent ?? '';
		expect(first).toHaveLength(20);

		await page.getByRole('button', { name: 'Generate another' }).click();
		expect(output.element().textContent).not.toBe(first);

		await page.getByRole('button', { name: 'Use' }).click();
		expect(onuse).toHaveBeenCalledOnce();
		expect(onuse.mock.calls[0]?.[0]).toHaveLength(20);
	});

	it('switches to EFF passphrases', async () => {
		await render(GeneratorPanel, {});
		await page.getByRole('tab', { name: 'Passphrase' }).click();
		const text = page.getByLabelText('Generated value').element().textContent ?? '';
		expect(text.split('-')).toHaveLength(6);
		await expect.element(page.getByText(/≈ 78 bits of entropy/)).toBeVisible();
	});
});
