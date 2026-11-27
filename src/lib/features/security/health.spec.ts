import { describe, expect, it } from 'vitest';
import { emptyItem, type ItemPayload } from '#lib/schemas/item.js';
import type { VaultEntry } from '#lib/features/vault/search.js';
import { analyzeVault } from './health';

function login(
	id: string,
	password: string,
	totp = '',
	deletedAt: string | null = null
): VaultEntry {
	const data = {
		...emptyItem('login'),
		name: id,
		login: { username: '', password, uris: [], totp }
	} as ItemPayload;
	return { id, revision: 1, deletedAt, createdAt: '', updatedAt: '', data };
}

describe('analyzeVault', () => {
	it('finds weak and reused passwords, ignoring trash', () => {
		const report = analyzeVault([
			login('a', 'password'),
			login('b', 'xK9#mQ2$vL7@pR4!', 'JBSWY3DPEHPK3PXP'),
			login('c', 'xK9#mQ2$vL7@pR4!'),
			login('d', 'password', '', '2026-01-01')
		]);
		expect(report.logins).toBe(3);
		expect(report.weak.map((e) => e.id)).toEqual(['a']);
		expect(report.reused.map((g) => g.map((e) => e.id))).toEqual([['b', 'c']]);
		expect(report.withoutTotp).toBe(2);
	});
});
