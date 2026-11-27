/**
 * Crypto engine core: a thin, typed layer over the Rust/WASM implementation of
 * docs/CRYPTOGRAPHY.md. Runs inside the crypto Web Worker (see worker.ts) and
 * in browser tests.
 *
 * Rules enforced here:
 * - The vault key never leaves WASM memory; only an opaque handle exists.
 * - Password and plaintext byte buffers are wiped after each call.
 * - Errors carry only coarse codes.
 */
import init, {
	KdfConfig,
	VaultKeyHandle,
	generateSalt,
	generateVaultKey,
	kdfPolicy as wasmKdfPolicy,
	unlockVaultKey
} from './wasm/cachepass_crypto.js';
import wasmUrl from './wasm/cachepass_crypto_bg.wasm?url';
import {
	base64UrlToBytes,
	bytesToBase64Url,
	encodePassword,
	newUuid,
	uuidToBytes
} from './encoding';
import {
	CryptoError,
	type CryptoErrorCode,
	type KdfParams,
	type KdfPolicy,
	type KeyEnvelope
} from './types';

let initPromise: Promise<void> | null = null;
let handle: VaultKeyHandle | null = null;

const KNOWN_CODES = new Set<CryptoErrorCode>([
	'invalid_kdf_params',
	'invalid_length',
	'malformed_envelope',
	'decryption_failed',
	'plaintext_too_large',
	'randomness_unavailable',
	'kdf_failed'
]);

function toCryptoError(err: unknown): CryptoError {
	if (err instanceof CryptoError) return err;
	const message = err instanceof Error ? err.message : String(err);
	return new CryptoError(
		KNOWN_CODES.has(message as CryptoErrorCode) ? (message as CryptoErrorCode) : 'kdf_failed'
	);
}

function guard<T>(fn: () => T): T {
	try {
		return fn();
	} catch (err) {
		throw toCryptoError(err);
	}
}

export function ready(): Promise<void> {
	initPromise ??= init({ module_or_path: wasmUrl }).then(() => undefined);
	return initPromise;
}

export function kdfPolicy(): KdfPolicy {
	const p = wasmKdfPolicy();
	return {
		defaultMemoryKib: p[0],
		minMemoryKib: p[1],
		maxMemoryKib: p[2],
		defaultIterations: p[3],
		minIterations: p[4],
		maxIterations: p[5],
		defaultParallelism: p[6],
		minParallelism: p[7],
		maxParallelism: p[8]
	};
}

function kdfConfig(kdf: KdfParams): KdfConfig {
	if (kdf.algorithm !== 'argon2id') throw new CryptoError('invalid_kdf_params');
	const salt = guard(() => base64UrlToBytes(kdf.salt));
	return guard(() => new KdfConfig(kdf.memory_kib, kdf.iterations, kdf.parallelism, salt));
}

function defaultKdf(): KdfParams {
	const policy = kdfPolicy();
	return {
		algorithm: 'argon2id',
		memory_kib: policy.defaultMemoryKib,
		iterations: policy.defaultIterations,
		parallelism: policy.defaultParallelism,
		salt: bytesToBase64Url(guard(() => generateSalt()))
	};
}

function withPassword<T>(password: string, fn: (bytes: Uint8Array) => T): T {
	const bytes = encodePassword(password);
	try {
		return guard(() => fn(bytes));
	} finally {
		bytes.fill(0);
	}
}

function wrapCurrent(password: string, vaultId: string, kdf: KdfParams): KeyEnvelope {
	const current = requireHandle();
	const config = kdfConfig(kdf);
	try {
		const wrapped = withPassword(password, (pw) => current.wrap(pw, uuidToBytes(vaultId), config));
		return { version: 1, kdf, wrapped_key: bytesToBase64Url(wrapped) };
	} finally {
		config.free();
	}
}

function requireHandle(): VaultKeyHandle {
	if (!handle) throw new CryptoError('locked');
	return handle;
}

function replaceHandle(next: VaultKeyHandle | null): void {
	handle?.free(); // zeroizes the key inside WASM memory
	handle = next;
}

/** Registration: new vault id + random vault key wrapped under the master password. */
export function createVault(masterPassword: string): { vaultId: string; envelope: KeyEnvelope } {
	const vaultId = newUuid();
	replaceHandle(guard(() => generateVaultKey()));
	try {
		return { vaultId, envelope: wrapCurrent(masterPassword, vaultId, defaultKdf()) };
	} catch (err) {
		replaceHandle(null);
		throw err;
	}
}

/** Unlock: derive the KEK locally and unwrap the vault key. */
export function unlock(masterPassword: string, vaultId: string, envelope: KeyEnvelope): void {
	if (envelope.version !== 1) throw new CryptoError('malformed_envelope');
	const config = kdfConfig(envelope.kdf);
	try {
		const wrapped = guard(() => base64UrlToBytes(envelope.wrapped_key));
		const next = withPassword(masterPassword, (pw) =>
			unlockVaultKey(pw, uuidToBytes(vaultId), config, wrapped)
		);
		replaceHandle(next);
	} finally {
		config.free();
	}
}

/** Check a master password without changing the unlocked state. */
export function verifyMasterPassword(
	masterPassword: string,
	vaultId: string,
	envelope: KeyEnvelope
): boolean {
	const config = kdfConfig(envelope.kdf);
	try {
		const wrapped = guard(() => base64UrlToBytes(envelope.wrapped_key));
		const probe = withPassword(masterPassword, (pw) =>
			unlockVaultKey(pw, uuidToBytes(vaultId), config, wrapped)
		);
		probe.free();
		return true;
	} catch (err) {
		if (err instanceof CryptoError && err.code === 'decryption_failed') return false;
		throw err;
	} finally {
		config.free();
	}
}

/** Master password change: same vault key, fresh salt, current default KDF parameters. */
export function rewrap(newMasterPassword: string, vaultId: string): KeyEnvelope {
	return wrapCurrent(newMasterPassword, vaultId, defaultKdf());
}

function encryptJson(
	op: (h: VaultKeyHandle, vault: Uint8Array, id: Uint8Array, plaintext: Uint8Array) => Uint8Array,
	vaultId: string,
	objectId: string,
	payload: unknown
): string {
	const h = requireHandle();
	const plaintext = new TextEncoder().encode(JSON.stringify(payload));
	try {
		return bytesToBase64Url(
			guard(() => op(h, uuidToBytes(vaultId), uuidToBytes(objectId), plaintext))
		);
	} finally {
		plaintext.fill(0);
	}
}

function decryptJson(
	op: (h: VaultKeyHandle, vault: Uint8Array, id: Uint8Array, envelope: Uint8Array) => Uint8Array,
	vaultId: string,
	objectId: string,
	ciphertext: string
): unknown {
	const h = requireHandle();
	const envelope = guard(() => base64UrlToBytes(ciphertext));
	const plaintext = guard(() => op(h, uuidToBytes(vaultId), uuidToBytes(objectId), envelope));
	try {
		return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(plaintext));
	} catch {
		throw new CryptoError('invalid_payload');
	} finally {
		plaintext.fill(0);
	}
}

export function encryptItem(vaultId: string, itemId: string, payload: unknown): string {
	return encryptJson((h, v, i, p) => h.encryptItem(v, i, p), vaultId, itemId, payload);
}

export function decryptItem(vaultId: string, itemId: string, ciphertext: string): unknown {
	return decryptJson((h, v, i, e) => h.decryptItem(v, i, e), vaultId, itemId, ciphertext);
}

export function encryptFolder(vaultId: string, folderId: string, payload: unknown): string {
	return encryptJson((h, v, i, p) => h.encryptFolder(v, i, p), vaultId, folderId, payload);
}

export function decryptFolder(vaultId: string, folderId: string, ciphertext: string): unknown {
	return decryptJson((h, v, i, e) => h.decryptFolder(v, i, e), vaultId, folderId, ciphertext);
}

export function lock(): void {
	replaceHandle(null);
}

export function isUnlocked(): boolean {
	return handle !== null;
}
