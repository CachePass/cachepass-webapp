import { describe, expect, it } from 'vitest';
import {
	base64UrlToBytes,
	bytesToBase64Url,
	encodePassword,
	isUuid,
	uuidToBytes
} from './encoding';

describe('encoding', () => {
	it('round-trips base64url without padding', () => {
		for (const len of [0, 1, 2, 3, 16, 74]) {
			const bytes = new Uint8Array(len).map((_, i) => (i * 37) & 0xff);
			const encoded = bytesToBase64Url(bytes);
			expect(encoded).not.toMatch(/[+/=]/);
			expect(base64UrlToBytes(encoded)).toEqual(bytes);
		}
	});

	it('rejects invalid base64url', () => {
		expect(() => base64UrlToBytes('a+b/')).toThrow();
		expect(() => base64UrlToBytes('abc=')).toThrow();
		expect(() => base64UrlToBytes('a')).toThrow();
	});

	it('encodes UUIDs as 16 raw bytes in RFC 9562 order', () => {
		expect(uuidToBytes('0f1e2d3c-4b5a-6978-8796-a5b4c3d2e1f0')).toEqual(
			new Uint8Array([
				0x0f, 0x1e, 0x2d, 0x3c, 0x4b, 0x5a, 0x69, 0x78, 0x87, 0x96, 0xa5, 0xb4, 0xc3, 0xd2, 0xe1,
				0xf0
			])
		);
		expect(isUuid('not-a-uuid')).toBe(false);
		expect(() => uuidToBytes('nope')).toThrow();
	});

	it('NFC-normalises passwords', () => {
		expect(encodePassword('é')).toEqual(encodePassword('é'));
	});
});
