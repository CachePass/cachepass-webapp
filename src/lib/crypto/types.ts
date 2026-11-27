/** Wire types for the key envelope (mirrors the backend KeyEnvelopeDto). */
export interface KdfParams {
	algorithm: 'argon2id';
	memory_kib: number;
	iterations: number;
	parallelism: number;
	/** 16-byte salt, unpadded base64url. */
	salt: string;
}

export interface KeyEnvelope {
	version: 1;
	kdf: KdfParams;
	/** 74-byte v1 envelope, unpadded base64url. */
	wrapped_key: string;
}

export interface KdfPolicy {
	defaultMemoryKib: number;
	minMemoryKib: number;
	maxMemoryKib: number;
	defaultIterations: number;
	minIterations: number;
	maxIterations: number;
	defaultParallelism: number;
	minParallelism: number;
	maxParallelism: number;
}

/** Coarse error codes raised by the engine (never contain secret data). */
export type CryptoErrorCode =
	| 'invalid_kdf_params'
	| 'invalid_length'
	| 'malformed_envelope'
	| 'decryption_failed'
	| 'plaintext_too_large'
	| 'randomness_unavailable'
	| 'kdf_failed'
	| 'locked'
	| 'invalid_payload'
	| 'engine_unavailable';

export class CryptoError extends Error {
	constructor(public readonly code: CryptoErrorCode) {
		super(code);
		this.name = 'CryptoError';
	}
}
