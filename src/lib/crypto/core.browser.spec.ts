/**
 * Cryptographic WASM integration tests (real Chromium, real WASM).
 *
 * 1. The Rust/WASM engine reproduces the spec vectors.
 * 2. The vectors are independently recomputed with @noble/hashes and
 *    @noble/ciphers from the spec text alone — a cross-implementation check of
 *    Argon2id, HKDF, the AAD layout, padding and XChaCha20-Poly1305 framing.
 */
import { describe, expect, it, beforeAll, afterEach } from 'vitest';
import { argon2id } from '@noble/hashes/argon2.js';
import { hkdf } from '@noble/hashes/hkdf.js';
import { sha256 } from '@noble/hashes/sha2.js';
import { xchacha20poly1305 } from '@noble/ciphers/chacha.js';
import * as core from './core';
import { bytesToBase64Url, base64UrlToBytes, uuidToBytes } from './encoding';
import { CryptoError, type KeyEnvelope } from './types';
import { VECTORS as V, hex, toHex } from './vectors';

const vectorEnvelope = (): KeyEnvelope => ({
	version: 1,
	kdf: { algorithm: 'argon2id', ...V.kdf, salt: bytesToBase64Url(hex(V.salt)) },
	wrapped_key: bytesToBase64Url(hex(V.wrapped))
});

function lp(field: Uint8Array): Uint8Array {
	const out = new Uint8Array(4 + field.length);
	new DataView(out.buffer).setUint32(0, field.length);
	out.set(field, 4);
	return out;
}

function concat(...parts: Uint8Array[]): Uint8Array {
	const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
	let o = 0;
	for (const p of parts) {
		out.set(p, o);
		o += p.length;
	}
	return out;
}

function aad(context: string, ...fields: Uint8Array[]): Uint8Array {
	return concat(new Uint8Array([1, 1]), lp(new TextEncoder().encode(context)), ...fields.map(lp));
}

function kdfDescriptor(): Uint8Array {
	const d = new Uint8Array(29);
	const view = new DataView(d.buffer);
	d[0] = 1;
	view.setUint32(1, V.kdf.memory_kib);
	view.setUint32(5, V.kdf.iterations);
	view.setUint32(9, V.kdf.parallelism);
	d.set(hex(V.salt), 13);
	return d;
}

function pad(data: Uint8Array): Uint8Array {
	const out = new Uint8Array((Math.floor(data.length / 64) + 1) * 64);
	out.set(data);
	out[data.length] = 0x80;
	return out;
}

beforeAll(async () => {
	await core.ready();
});

afterEach(() => core.lock());

describe('independent re-implementation (@noble) matches the spec vectors', () => {
	it('derives IKM and KEK', () => {
		const ikm = argon2id(new TextEncoder().encode(V.password), hex(V.salt), {
			t: 2,
			m: 19456,
			p: 1,
			dkLen: 32
		});
		expect(toHex(ikm)).toBe(V.ikm);
		const kek = hkdf(sha256, ikm, undefined, new TextEncoder().encode('cachepass/v1/kek'), 32);
		expect(toHex(kek)).toBe(V.kek);
	});

	it('wraps the vault key with the vault-key AAD', () => {
		const a = aad('cachepass/v1/vault-key', uuidToBytes(V.vaultId), kdfDescriptor());
		const ct = xchacha20poly1305(hex(V.kek), hex(V.nonceWrap), a).encrypt(hex(V.dek));
		expect(toHex(concat(new Uint8Array([1, 1]), hex(V.nonceWrap), ct))).toBe(V.wrapped);
	});

	it('encrypts the padded item payload with the item AAD', () => {
		const a = aad('cachepass/v1/item', uuidToBytes(V.vaultId), uuidToBytes(V.itemId));
		const ct = xchacha20poly1305(hex(V.dek), hex(V.nonceItem), a).encrypt(
			pad(new TextEncoder().encode(V.itemJson))
		);
		expect(toHex(concat(new Uint8Array([1, 1]), hex(V.nonceItem), ct))).toBe(V.item);
	});
});

describe('WASM engine', () => {
	it('exposes the documented KDF policy', () => {
		expect(core.kdfPolicy()).toEqual({
			defaultMemoryKib: 65536,
			minMemoryKib: 19456,
			maxMemoryKib: 1048576,
			defaultIterations: 3,
			minIterations: 2,
			maxIterations: 32,
			defaultParallelism: 1,
			minParallelism: 1,
			maxParallelism: 16
		});
	});

	it('unlocks the vector vault and decrypts the vector item', () => {
		core.unlock(V.password, V.vaultId, vectorEnvelope());
		expect(core.isUnlocked()).toBe(true);
		const item = core.decryptItem(V.vaultId, V.itemId, bytesToBase64Url(hex(V.item)));
		expect(item).toEqual(JSON.parse(V.itemJson));
	});

	it('produces ciphertext that @noble can decrypt with the known DEK', () => {
		core.unlock(V.password, V.vaultId, vectorEnvelope());
		const payload = { schema: 1, type: 'login', name: 'Example', password: 'hunter2' };
		const ct = base64UrlToBytes(core.encryptItem(V.vaultId, V.itemId, payload));
		expect([ct[0], ct[1]]).toEqual([1, 1]);
		expect((ct.length - 42) % 64).toBe(0);
		const a = aad('cachepass/v1/item', uuidToBytes(V.vaultId), uuidToBytes(V.itemId));
		const padded = xchacha20poly1305(hex(V.dek), ct.slice(2, 26), a).decrypt(ct.slice(26));
		const end = padded.lastIndexOf(0x80);
		expect(JSON.parse(new TextDecoder().decode(padded.slice(0, end)))).toEqual(payload);
	});

	it('uses a fresh nonce for every encryption', () => {
		core.unlock(V.password, V.vaultId, vectorEnvelope());
		const a = core.encryptItem(V.vaultId, V.itemId, { x: 1 });
		const b = core.encryptItem(V.vaultId, V.itemId, { x: 1 });
		expect(a).not.toBe(b);
		expect(a.slice(0, 40)).not.toBe(b.slice(0, 40));
	});

	it('rejects a wrong master password with decryption_failed', () => {
		expect(() =>
			core.unlock('correct horse battery stapler', V.vaultId, vectorEnvelope())
		).toThrowError(new CryptoError('decryption_failed'));
		expect(core.isUnlocked()).toBe(false);
	});

	it('normalises the master password to NFC', () => {
		const vault = core.createVault('Café master password!');
		core.lock();
		// Decomposed "e + combining acute" must unlock the same vault.
		core.unlock('Café master password!', vault.vaultId, vault.envelope);
		expect(core.isUnlocked()).toBe(true);
	});

	it('rejects KDF parameters outside the policy (downgrade / DoS)', () => {
		const weak = vectorEnvelope();
		weak.kdf.memory_kib = 1024;
		expect(() => core.unlock(V.password, V.vaultId, weak)).toThrowError(
			new CryptoError('invalid_kdf_params')
		);
		const huge = vectorEnvelope();
		huge.kdf.memory_kib = 4 * 1024 * 1024;
		expect(() => core.unlock(V.password, V.vaultId, huge)).toThrowError(
			new CryptoError('invalid_kdf_params')
		);
		// In-bounds but different parameters break the AAD binding.
		const tampered = vectorEnvelope();
		tampered.kdf.iterations = 3;
		expect(() => core.unlock(V.password, V.vaultId, tampered)).toThrowError(
			new CryptoError('decryption_failed')
		);
	});

	it('binds ciphertexts to their vault, item and object type', () => {
		core.unlock(V.password, V.vaultId, vectorEnvelope());
		const ct = core.encryptItem(V.vaultId, V.itemId, { a: 1 });
		const otherId = '22222222-2222-4222-8222-222222222222';
		expect(() => core.decryptItem(V.vaultId, otherId, ct)).toThrowError(
			new CryptoError('decryption_failed')
		);
		expect(() => core.decryptItem(otherId, V.itemId, ct)).toThrowError(
			new CryptoError('decryption_failed')
		);
		expect(() => core.decryptFolder(V.vaultId, V.itemId, ct)).toThrowError(
			new CryptoError('decryption_failed')
		);
	});

	it('rejects tampered and malformed ciphertext', () => {
		core.unlock(V.password, V.vaultId, vectorEnvelope());
		const bytes = hex(V.item);
		bytes[40] ^= 1;
		expect(() => core.decryptItem(V.vaultId, V.itemId, bytesToBase64Url(bytes))).toThrowError(
			new CryptoError('decryption_failed')
		);
		const badVersion = hex(V.item);
		badVersion[0] = 2;
		expect(() => core.decryptItem(V.vaultId, V.itemId, bytesToBase64Url(badVersion))).toThrowError(
			new CryptoError('malformed_envelope')
		);
		expect(() => core.decryptItem(V.vaultId, V.itemId, 'AAAA')).toThrowError(
			new CryptoError('malformed_envelope')
		);
	});

	it('creates, rewraps and verifies master passwords without changing the vault key', () => {
		const { vaultId, envelope } = core.createVault('first master password');
		expect(envelope.kdf.memory_kib).toBe(65536);
		expect(base64UrlToBytes(envelope.wrapped_key)).toHaveLength(74);
		const itemId = crypto.randomUUID();
		const ct = core.encryptItem(vaultId, itemId, { secret: 'value' });

		const rewrapped = core.rewrap('second master password', vaultId);
		expect(rewrapped.kdf.salt).not.toBe(envelope.kdf.salt);
		expect(core.verifyMasterPassword('second master password', vaultId, rewrapped)).toBe(true);
		expect(core.verifyMasterPassword('first master password', vaultId, rewrapped)).toBe(false);

		core.lock();
		expect(() => core.decryptItem(vaultId, itemId, ct)).toThrowError(new CryptoError('locked'));
		core.unlock('second master password', vaultId, rewrapped);
		expect(core.decryptItem(vaultId, itemId, ct)).toEqual({ secret: 'value' });
	});

	it('encrypts folders separately from items', () => {
		const { vaultId } = core.createVault('folder master password');
		const folderId = crypto.randomUUID();
		const ct = core.encryptFolder(vaultId, folderId, { schema: 1, name: 'Work' });
		expect(core.decryptFolder(vaultId, folderId, ct)).toEqual({ schema: 1, name: 'Work' });
		expect(() => core.decryptItem(vaultId, folderId, ct)).toThrowError(
			new CryptoError('decryption_failed')
		);
	});

	it('refuses oversized payloads', () => {
		core.createVault('size master password');
		expect(() => core.encryptItem(V.vaultId, V.itemId, { blob: 'x'.repeat(300_000) })).toThrowError(
			new CryptoError('plaintext_too_large')
		);
	});
});
