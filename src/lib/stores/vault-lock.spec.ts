/**
 * Regression test: a write that completes after the vault was locked must not
 * put decrypted data back into the store (docs/CRYPTOGRAPHY.md §8 "Lock").
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const deferred = <T>() => {
	let resolve!: (v: T) => void;
	const promise = new Promise<T>((r) => (resolve = r));
	return { promise, resolve };
};

const createItem = vi.fn<(...args: unknown[]) => Promise<unknown>>();
vi.mock('#lib/api/index.js', () => ({
	ApiError: class extends Error {},
	api: {
		vault: {
			keyEnvelope: vi.fn(() =>
				Promise.resolve({ version: 1, kdf: {}, wrapped_key: '', revision: 1 })
			),
			sync: vi.fn(() =>
				Promise.resolve({
					vault_id: '0f1e2d3c-4b5a-6978-8796-a5b4c3d2e1f0',
					revision: 1,
					full: true,
					items: [],
					folders: [],
					tombstones: [],
					key_revision: 1
				})
			),
			createItem: (...args: unknown[]) => createItem(...args)
		}
	}
}));
vi.mock('#lib/crypto/index.js', () => ({
	CryptoError: class CryptoError extends Error {
		constructor(public code: string) {
			super(code);
		}
	},
	destroyEngine: vi.fn(() => Promise.resolve()),
	newUuid: () => '11111111-2222-4333-8444-555555555555',
	engine: {
		unlock: vi.fn(() => Promise.resolve()),
		decryptItems: vi.fn(() => Promise.resolve([])),
		encryptItem: vi.fn(() => Promise.resolve('AQE'))
	}
}));
vi.mock('#lib/features/vault/clipboard.js', () => ({
	clearClipboardNow: vi.fn(() => Promise.resolve())
}));

const { vault } = await import('./vault.svelte.js');
const { emptyItem } = await import('#lib/schemas/item.js');

describe('vault store lock race', () => {
	beforeEach(async () => {
		await vault.unlock('master password', '0f1e2d3c-4b5a-6978-8796-a5b4c3d2e1f0');
	});

	it('drops results of a create that finishes after lock', async () => {
		const pending = deferred<unknown>();
		createItem.mockReturnValueOnce(pending.promise);
		const create = vault.createItem({ ...emptyItem('note'), name: 'Secret note' });
		await vault.lock();
		pending.resolve({
			id: '11111111-2222-4333-8444-555555555555',
			revision: 1,
			ciphertext: 'AQE',
			deleted_at: null,
			created_at: '2026-01-01T00:00:00Z',
			updated_at: '2026-01-01T00:00:00Z'
		});
		await expect(create).rejects.toThrow('locked');
		expect(vault.entries.size).toBe(0);
		expect(vault.unlocked).toBe(false);
	});

	it('still applies results when the vault stays unlocked', async () => {
		createItem.mockResolvedValueOnce({
			id: '11111111-2222-4333-8444-555555555555',
			revision: 1,
			ciphertext: 'AQE',
			deleted_at: null,
			created_at: '2026-01-01T00:00:00Z',
			updated_at: '2026-01-01T00:00:00Z'
		});
		await vault.createItem({ ...emptyItem('note'), name: 'Kept note' });
		expect(vault.entries.size).toBe(1);
		await vault.lock();
		expect(vault.entries.size).toBe(0);
	});
});
