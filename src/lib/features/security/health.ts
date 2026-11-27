/** Local vault health report: weak and reused login passwords. Runs entirely on decrypted data in memory. */
import type { VaultEntry } from '#lib/features/vault/search.js';
import { estimateStrength } from './strength.js';

export interface HealthReport {
	logins: number;
	weak: VaultEntry[];
	reused: VaultEntry[][];
	withoutTotp: number;
}

export function analyzeVault(entries: VaultEntry[]): HealthReport {
	const logins = entries.filter((e) => e.deletedAt === null && e.data.type === 'login');
	const weak: VaultEntry[] = [];
	const byPassword = new Map<string, VaultEntry[]>();
	let withoutTotp = 0;
	for (const entry of logins) {
		if (entry.data.type !== 'login') continue;
		const { password, totp } = entry.data.login;
		if (!totp) withoutTotp++;
		if (!password) continue;
		if (estimateStrength(password).score < 2) weak.push(entry);
		const group = byPassword.get(password) ?? [];
		group.push(entry);
		byPassword.set(password, group);
	}
	const reused = [...byPassword.values()].filter((g) => g.length > 1);
	return { logins: logins.length, weak, reused, withoutTotp };
}
