/**
 * RFC 6238 TOTP code generation for vault items (runs locally via WebCrypto).
 * Accepts a base32 secret or an `otpauth://totp/...` URI.
 */

export interface TotpConfig {
	secret: Uint8Array;
	algorithm: 'SHA-1' | 'SHA-256' | 'SHA-512';
	digits: number;
	period: number;
}

export function base32Decode(input: string): Uint8Array {
	const clean = input.toUpperCase().replace(/[\s-]/g, '').replace(/=+$/, '');
	if (!/^[A-Z2-7]+$/.test(clean)) throw new Error('Invalid secret: expected base32.');
	const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
	let bits = 0;
	let value = 0;
	const out: number[] = [];
	for (const c of clean) {
		value = (value << 5) | alphabet.indexOf(c);
		bits += 5;
		if (bits >= 8) {
			bits -= 8;
			out.push((value >>> bits) & 0xff);
		}
	}
	return new Uint8Array(out);
}

export function parseTotp(input: string): TotpConfig {
	const raw = input.trim();
	if (raw.toLowerCase().startsWith('otpauth://')) {
		const url = new URL(raw);
		if (url.host.toLowerCase() !== 'totp') throw new Error('Only TOTP URIs are supported.');
		const algo = (url.searchParams.get('algorithm') ?? 'SHA1').toUpperCase();
		const digits = Number(url.searchParams.get('digits') ?? 6);
		const period = Number(url.searchParams.get('period') ?? 30);
		const algorithm = algo === 'SHA256' ? 'SHA-256' : algo === 'SHA512' ? 'SHA-512' : 'SHA-1';
		if (![6, 7, 8].includes(digits) || !(period >= 1 && period <= 300))
			throw new Error('Unsupported TOTP parameters.');
		return {
			secret: base32Decode(url.searchParams.get('secret') ?? ''),
			algorithm,
			digits,
			period
		};
	}
	return { secret: base32Decode(raw), algorithm: 'SHA-1', digits: 6, period: 30 };
}

export async function totpAt(config: TotpConfig, unixSeconds: number): Promise<string> {
	const counter = Math.floor(unixSeconds / config.period);
	const msg = new Uint8Array(8);
	new DataView(msg.buffer).setBigUint64(0, BigInt(counter));
	const key = await crypto.subtle.importKey(
		'raw',
		config.secret as BufferSource,
		{ name: 'HMAC', hash: config.algorithm },
		false,
		['sign']
	);
	const mac = new Uint8Array(await crypto.subtle.sign('HMAC', key, msg));
	const offset = mac[mac.length - 1] & 0x0f;
	const binary = new DataView(mac.buffer).getUint32(offset) & 0x7fffffff;
	return String(binary % 10 ** config.digits).padStart(config.digits, '0');
}

/** Seconds remaining in the current period. */
export function secondsRemaining(config: TotpConfig, unixSeconds: number): number {
	return config.period - (Math.floor(unixSeconds) % config.period);
}
