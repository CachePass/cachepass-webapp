import { describe, expect, it } from 'vitest';
import { base32Decode, parseTotp, secondsRemaining, totpAt } from './totp';

// RFC 6238 Appendix B seeds.
const SHA1 = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ'; // "12345678901234567890"
const SHA256 = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQGEZA';
const SHA512 =
	'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQGEZDGNA';

describe('TOTP (RFC 6238)', () => {
	it('matches the SHA-1/256/512 vectors', async () => {
		const cases: [string, string, number, string][] = [
			['SHA1', SHA1, 59, '94287082'],
			['SHA1', SHA1, 1111111109, '07081804'],
			['SHA1', SHA1, 2000000000, '69279037'],
			['SHA256', SHA256, 59, '46119246'],
			['SHA256', SHA256, 1234567890, '91819424'],
			['SHA512', SHA512, 59, '90693936'],
			['SHA512', SHA512, 20000000000, '47863826']
		];
		for (const [algo, secret, t, expected] of cases) {
			const cfg = parseTotp(`otpauth://totp/x?secret=${secret}&algorithm=${algo}&digits=8`);
			expect(await totpAt(cfg, t)).toBe(expected);
		}
	});

	it('parses plain base32 secrets with defaults', async () => {
		const cfg = parseTotp('gezd gnbv gy3t qojq gezd gnbv gy3t qojq');
		expect(cfg).toMatchObject({ algorithm: 'SHA-1', digits: 6, period: 30 });
		expect(await totpAt(cfg, 59)).toBe('287082');
		expect(secondsRemaining(cfg, 59)).toBe(1);
	});

	it('rejects invalid secrets and URIs', () => {
		expect(() => base32Decode('not base32!')).toThrow();
		expect(() => parseTotp('otpauth://hotp/x?secret=GEZDGNBV')).toThrow();
		expect(() => parseTotp('otpauth://totp/x?secret=GEZDGNBV&digits=4')).toThrow();
	});
});
