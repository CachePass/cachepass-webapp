/**
 * Heuristic password strength estimate. It is deliberately conservative and
 * runs locally; it is NOT a guarantee. Patterns that attackers try first
 * (common passwords, keyboard walks, repeats, sequences, dates) reduce the
 * estimated entropy.
 */

export type StrengthScore = 0 | 1 | 2 | 3 | 4;

export interface StrengthResult {
	score: StrengthScore;
	label: 'Very weak' | 'Weak' | 'Fair' | 'Strong' | 'Very strong';
	bits: number;
	feedback: string[];
}

const COMMON = new Set([
	'password',
	'passw0rd',
	'123456',
	'12345678',
	'123456789',
	'qwerty',
	'qwertyuiop',
	'abc123',
	'letmein',
	'welcome',
	'monkey',
	'dragon',
	'iloveyou',
	'admin',
	'login',
	'master',
	'secret',
	'sunshine',
	'princess',
	'football',
	'baseball',
	'superman',
	'trustno1',
	'starwars',
	'whatever',
	'shadow',
	'michael',
	'charlie',
	'changeme',
	'default',
	'hello',
	'freedom',
	'qazwsx',
	'zxcvbnm',
	'asdfgh',
	'111111',
	'000000',
	'654321'
]);
const WALKS = ['qwertyuiop', 'asdfghjkl', 'zxcvbnm', '1234567890', 'abcdefghijklmnopqrstuvwxyz'];
const LABELS = ['Very weak', 'Weak', 'Fair', 'Strong', 'Very strong'] as const;

function poolSize(pw: string): number {
	let pool = 0;
	if (/[a-z]/.test(pw)) pool += 26;
	if (/[A-Z]/.test(pw)) pool += 26;
	if (/[0-9]/.test(pw)) pool += 10;
	if (/[^A-Za-z0-9\s]/.test(pw)) pool += 33;
	if (/\s/.test(pw)) pool += 1;
	if ([...pw].some((c) => (c.codePointAt(0) ?? 0) > 0x7f)) pool += 100;
	return Math.max(pool, 1);
}

function sequenceRuns(lower: string): number {
	let penalty = 0;
	for (const walk of WALKS) {
		for (let len = walk.length; len >= 4; len--) {
			for (let i = 0; i + len <= walk.length; i++) {
				const seg = walk.slice(i, i + len);
				const rev = [...seg].reverse().join('');
				if (lower.includes(seg) || lower.includes(rev)) {
					penalty = Math.max(penalty, len - 1);
				}
			}
		}
	}
	return penalty;
}

export function estimateStrength(password: string): StrengthResult {
	const feedback: string[] = [];
	if (!password) return { score: 0, label: LABELS[0], bits: 0, feedback: ['Enter a password.'] };

	const chars = [...password];
	const lower = password.toLowerCase();
	const deLeet = lower
		.replace(/[@4]/g, 'a')
		.replace(/3/g, 'e')
		.replace(/[1!]/g, 'i')
		.replace(/0/g, 'o')
		.replace(/[$5]/g, 's');
	let effectiveLength = chars.length;

	// Repeated characters (aaaa) and repeated chunks (abcabc).
	const repeats = (password.match(/(.)\1{2,}/gu) ?? []).reduce((n, m) => n + m.length - 1, 0);
	if (repeats) feedback.push('Avoid repeated characters.');
	effectiveLength -= repeats;
	const chunk = /^(.+?)\1+$/u.exec(password);
	if (chunk) {
		effectiveLength = Math.min(effectiveLength, [...chunk[1]].length + 1);
		feedback.push('Avoid repeating the same pattern.');
	}

	const seq = sequenceRuns(lower);
	if (seq) {
		effectiveLength -= seq;
		feedback.push('Avoid keyboard patterns and sequences.');
	}
	if (/(19|20)\d{2}/.test(password)) {
		effectiveLength -= 3;
		feedback.push('Avoid years and dates.');
	}

	let bits = Math.max(effectiveLength, 1) * Math.log2(poolSize(password));
	const stripped = deLeet.replace(/[^a-z]/g, '');
	if (COMMON.has(lower) || COMMON.has(deLeet) || COMMON.has(stripped)) {
		bits = Math.min(bits, 10);
		feedback.push('This is a commonly used password.');
	} else if ([...COMMON].some((c) => c.length >= 5 && deLeet.includes(c))) {
		bits -= 15;
		feedback.push('Avoid common words and passwords.');
	}
	bits = Math.max(0, Math.round(bits));

	if (chars.length < 12) feedback.push('Use at least 12 characters (16+ for a master password).');
	if (poolSize(password) < 40 && chars.length < 20)
		feedback.push('Mix in other character types or use more words.');

	const score: StrengthScore = bits < 28 ? 0 : bits < 45 ? 1 : bits < 60 ? 2 : bits < 80 ? 3 : 4;
	return {
		score,
		label: LABELS[score],
		bits,
		feedback: score >= 3 ? feedback.slice(0, 1) : feedback
	};
}
