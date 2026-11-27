/**
 * Encoding helpers shared by the crypto engine and the API layer.
 * Binary values travel as unpadded base64url (RFC 4648 §5), UUIDs as their
 * 16 raw bytes inside associated data.
 */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function bytesToBase64Url(bytes: Uint8Array): string {
	let binary = '';
	for (const b of bytes) binary += String.fromCharCode(b);
	return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function base64UrlToBytes(value: string): Uint8Array {
	if (!/^[A-Za-z0-9_-]*$/.test(value) || value.length % 4 === 1) {
		throw new TypeError('invalid base64url');
	}
	const padded =
		value.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (value.length % 4)) % 4);
	const binary = atob(padded);
	const out = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
	return out;
}

export function isUuid(value: string): boolean {
	return UUID_RE.test(value);
}

export function uuidToBytes(uuid: string): Uint8Array {
	if (!isUuid(uuid)) throw new TypeError('invalid uuid');
	const hex = uuid.replace(/-/g, '');
	const out = new Uint8Array(16);
	for (let i = 0; i < 16; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
	return out;
}

/** UTF-8 encode a secret after NFC normalisation (docs/CRYPTOGRAPHY.md §3.1). */
export function encodePassword(password: string): Uint8Array {
	return new TextEncoder().encode(password.normalize('NFC'));
}

export function newUuid(): string {
	return crypto.randomUUID();
}
