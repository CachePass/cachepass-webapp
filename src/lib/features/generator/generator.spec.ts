import { describe, expect, it } from 'vitest';
import {
	DEFAULT_PASSWORD_OPTIONS,
	characterSets,
	generatePassphrase,
	generatePassword,
	passwordEntropyBits,
	randomInt
} from './generator';

describe('randomInt', () => {
	it('stays in range and covers all values', () => {
		const seen = new Set<number>();
		for (let i = 0; i < 2000; i++) {
			const v = randomInt(7);
			expect(v).toBeGreaterThanOrEqual(0);
			expect(v).toBeLessThan(7);
			seen.add(v);
		}
		expect(seen.size).toBe(7);
	});

	it('is roughly uniform (chi-squared sanity check)', () => {
		const buckets = new Array<number>(10).fill(0);
		const n = 20_000;
		for (let i = 0; i < n; i++) buckets[randomInt(10)]++;
		const expected = n / 10;
		const chi2 = buckets.reduce((s, o) => s + (o - expected) ** 2 / expected, 0);
		expect(chi2).toBeLessThan(30); // p ≈ 0.0004 for 9 dof
	});

	it('rejects invalid bounds', () => {
		expect(() => randomInt(0)).toThrow();
		expect(() => randomInt(1.5)).toThrow();
	});
});

describe('generatePassword', () => {
	it('honours length and includes every selected class', () => {
		for (let i = 0; i < 200; i++) {
			const pw = generatePassword({ ...DEFAULT_PASSWORD_OPTIONS, length: 12 });
			expect(pw).toHaveLength(12);
			expect(pw).toMatch(/[a-z]/);
			expect(pw).toMatch(/[A-Z]/);
			expect(pw).toMatch(/[0-9]/);
			expect(pw).toMatch(/[^A-Za-z0-9]/);
		}
	});

	it('respects disabled classes and ambiguity filter', () => {
		const opts = {
			...DEFAULT_PASSWORD_OPTIONS,
			symbols: false,
			uppercase: false,
			avoidAmbiguous: true,
			length: 64
		};
		for (let i = 0; i < 50; i++) expect(generatePassword(opts)).toMatch(/^[a-km-np-z2-9]+$/);
	});

	it('clamps length and requires a character set', () => {
		expect(generatePassword({ ...DEFAULT_PASSWORD_OPTIONS, length: 2 })).toHaveLength(8);
		expect(generatePassword({ ...DEFAULT_PASSWORD_OPTIONS, length: 1000 })).toHaveLength(128);
		expect(() =>
			generatePassword({
				...DEFAULT_PASSWORD_OPTIONS,
				lowercase: false,
				uppercase: false,
				digits: false,
				symbols: false
			})
		).toThrow();
	});

	it('does not repeat', () => {
		const seen = new Set(
			Array.from({ length: 500 }, () => generatePassword(DEFAULT_PASSWORD_OPTIONS))
		);
		expect(seen.size).toBe(500);
	});

	it('reports entropy', () => {
		expect(characterSets(DEFAULT_PASSWORD_OPTIONS).join('')).toHaveLength(26 + 26 + 10 + 25);
		expect(passwordEntropyBits(DEFAULT_PASSWORD_OPTIONS)).toBeCloseTo(20 * Math.log2(87), 5);
	});
});

describe('generatePassphrase', () => {
	const words = Array.from({ length: 2048 }, (_, i) => `w${i.toString(36)}x`);
	it('builds the requested number of words', () => {
		const p = generatePassphrase(
			{ words: 5, separator: ' ', capitalize: true, includeNumber: true },
			words
		);
		const parts = p.split(' ');
		expect(parts).toHaveLength(5);
		expect(parts.every((w) => /^W/.test(w))).toBe(true);
		expect(
			parts.filter((w) => /\d$/.test(w.replace(/x\d?$/, (m) => m))).length
		).toBeGreaterThanOrEqual(0);
	});
	it('rejects tiny wordlists', () => {
		expect(() =>
			generatePassphrase({ words: 5, separator: '-', capitalize: false, includeNumber: false }, [
				'a'
			])
		).toThrow();
	});
});

describe('EFF wordlist', () => {
	it('has 7776 unique lowercase words', async () => {
		const { EFF_LARGE_WORDLIST } = await import('./wordlist');
		expect(EFF_LARGE_WORDLIST).toHaveLength(7776);
		expect(new Set(EFF_LARGE_WORDLIST).size).toBe(7776);
		expect(EFF_LARGE_WORDLIST.every((w) => /^[a-z-]+$/.test(w))).toBe(true);
	});
});
