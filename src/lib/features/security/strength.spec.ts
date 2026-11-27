import { describe, expect, it } from 'vitest';
import { estimateStrength } from './strength';

describe('estimateStrength', () => {
	it('rates empty and common passwords as very weak', () => {
		expect(estimateStrength('').score).toBe(0);
		for (const pw of ['password', 'P@ssw0rd', '123456789', 'qwertyuiop', 'aaaaaaaaaaaa']) {
			expect(estimateStrength(pw).score, pw).toBeLessThanOrEqual(1);
		}
	});

	it('penalises patterns', () => {
		expect(estimateStrength('abcabcabcabc').bits).toBeLessThan(
			estimateStrength('kq7vz2mwp9rd').bits
		);
		expect(estimateStrength('Summer2024!!').feedback.join(' ')).toMatch(/years/);
	});

	it('rates long random passwords and passphrases highly', () => {
		expect(estimateStrength('xK9#mQ2$vL7@pR4!').score).toBe(4);
		expect(estimateStrength('correct-horse-battery-staple-orbit').score).toBeGreaterThanOrEqual(3);
	});

	it('is monotonic-ish in length for random input', () => {
		expect(estimateStrength('k7Pq').score).toBeLessThan(estimateStrength('k7Pq2mZx9vRt').score);
	});
});
