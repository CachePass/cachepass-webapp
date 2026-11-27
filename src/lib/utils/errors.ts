/** Map errors to user-facing messages that never include secret values. */
import { ApiError } from '#lib/api/index.js';
import { CryptoError } from '#lib/crypto/index.js';
import { ConflictError } from '#lib/stores/vault.svelte.js';

export function errorMessage(
	err: unknown,
	fallback = 'Something went wrong. Please try again.'
): string {
	if (err instanceof ConflictError) return err.message;
	if (err instanceof CryptoError) {
		switch (err.code) {
			case 'decryption_failed':
				return 'The master password is incorrect.';
			case 'invalid_kdf_params':
				return 'The vault key parameters from the server are outside the accepted range. Unlock was refused for your safety.';
			case 'plaintext_too_large':
				return 'This item is too large to store.';
			case 'locked':
				return 'The vault is locked.';
			case 'engine_unavailable':
				return 'The encryption engine could not start in this browser.';
			default:
				return 'A cryptographic operation failed.';
		}
	}
	if (err instanceof ApiError) {
		if (err.code === 'rate_limited')
			return 'Too many attempts. Please wait a moment and try again.';
		if (err.code === 'validation_failed' && err.fields.length)
			return err.fields.map((f) => f.message).join(' ');
		return err.message;
	}
	return fallback;
}

export function relativeTime(iso: string, now = Date.now()): string {
	const diff = Math.round((new Date(iso).getTime() - now) / 1000);
	const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });
	const abs = Math.abs(diff);
	if (abs < 60) return rtf.format(diff, 'second');
	if (abs < 3600) return rtf.format(Math.round(diff / 60), 'minute');
	if (abs < 86400) return rtf.format(Math.round(diff / 3600), 'hour');
	if (abs < 86400 * 30) return rtf.format(Math.round(diff / 86400), 'day');
	return new Date(iso).toLocaleDateString();
}
