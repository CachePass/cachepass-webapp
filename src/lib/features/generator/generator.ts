/**
 * Password and passphrase generation from the browser CSPRNG
 * (crypto.getRandomValues) with rejection sampling — no modulo bias.
 */

export interface PasswordOptions {
	length: number;
	lowercase: boolean;
	uppercase: boolean;
	digits: boolean;
	symbols: boolean;
	/** Exclude look-alike characters (0 O o 1 l I |). */
	avoidAmbiguous: boolean;
}

export const DEFAULT_PASSWORD_OPTIONS: PasswordOptions = {
	length: 20,
	lowercase: true,
	uppercase: true,
	digits: true,
	symbols: true,
	avoidAmbiguous: false
};

export const MIN_LENGTH = 8;
export const MAX_LENGTH = 128;

const SETS = {
	lowercase: 'abcdefghijklmnopqrstuvwxyz',
	uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
	digits: '0123456789',
	symbols: '!@#$%^&*()-_=+[]{};:,.?/~'
} as const;
const AMBIGUOUS = new Set('0Oo1lI|');

/** Uniform random integer in [0, max) using rejection sampling. */
export function randomInt(max: number): number {
	if (!Number.isInteger(max) || max <= 0 || max > 2 ** 32) throw new RangeError('max out of range');
	const limit = Math.floor(2 ** 32 / max) * max;
	const buf = new Uint32Array(1);
	for (;;) {
		crypto.getRandomValues(buf);
		if (buf[0] < limit) return buf[0] % max;
	}
}

function pick(chars: string): string {
	return chars[randomInt(chars.length)];
}

function shuffle<T>(items: T[]): T[] {
	for (let i = items.length - 1; i > 0; i--) {
		const j = randomInt(i + 1);
		[items[i], items[j]] = [items[j], items[i]];
	}
	return items;
}

export function characterSets(options: PasswordOptions): string[] {
	return (Object.keys(SETS) as (keyof typeof SETS)[])
		.filter((key) => options[key])
		.map((key) =>
			[...SETS[key]].filter((c) => !options.avoidAmbiguous || !AMBIGUOUS.has(c)).join('')
		);
}

/** Generate a password containing at least one character from each selected set. */
export function generatePassword(options: PasswordOptions): string {
	const sets = characterSets(options);
	if (sets.length === 0) throw new Error('Select at least one character set.');
	const length = Math.min(MAX_LENGTH, Math.max(MIN_LENGTH, Math.trunc(options.length)));
	const all = sets.join('');
	const chars = sets.map(pick);
	while (chars.length < length) chars.push(pick(all));
	return shuffle(chars).join('');
}

/** Entropy in bits of a generated password (charset^length, ignoring the per-set guarantee). */
export function passwordEntropyBits(options: PasswordOptions): number {
	const size = characterSets(options).join('').length;
	return size === 0 ? 0 : Math.trunc(options.length) * Math.log2(size);
}

export interface PassphraseOptions {
	words: number;
	separator: string;
	capitalize: boolean;
	includeNumber: boolean;
}

export const DEFAULT_PASSPHRASE_OPTIONS: PassphraseOptions = {
	words: 6,
	separator: '-',
	capitalize: false,
	includeNumber: false
};

export function generatePassphrase(
	options: PassphraseOptions,
	wordlist: readonly string[]
): string {
	if (wordlist.length < 1024) throw new Error('wordlist too small');
	const count = Math.min(20, Math.max(4, Math.trunc(options.words)));
	const words = Array.from({ length: count }, () => {
		const w = wordlist[randomInt(wordlist.length)];
		return options.capitalize ? w[0].toUpperCase() + w.slice(1) : w;
	});
	if (options.includeNumber) {
		const i = randomInt(words.length);
		words[i] = `${words[i]}${randomInt(10)}`;
	}
	return words.join(options.separator);
}

export function passphraseEntropyBits(options: PassphraseOptions, wordlistSize: number): number {
	return (
		Math.trunc(options.words) * Math.log2(wordlistSize) +
		(options.includeNumber ? Math.log2(10) : 0)
	);
}
