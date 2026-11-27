/// <reference lib="webworker" />
/**
 * Crypto worker. Owns the WASM instance and therefore the unlocked vault key.
 * Keeps Argon2id off the UI thread.
 */
import * as core from './core';
import type { EngineApi, EngineRequest, EngineResponse } from './protocol';
import { CryptoError } from './types';

const api: EngineApi = {
	kdfPolicy: () => core.kdfPolicy(),
	createVault: (p) => core.createVault(p),
	unlock: (p, v, e) => core.unlock(p, v, e),
	verifyMasterPassword: (p, v, e) => core.verifyMasterPassword(p, v, e),
	rewrap: (p, v) => core.rewrap(p, v),
	encryptItem: (v, i, p) => core.encryptItem(v, i, p),
	decryptItem: (v, i, c) => core.decryptItem(v, i, c),
	decryptItems: (vaultId, items) =>
		items.map(({ id, ciphertext }) => {
			try {
				return { id, payload: core.decryptItem(vaultId, id, ciphertext) };
			} catch (err) {
				return { id, error: err instanceof CryptoError ? err.code : 'decryption_failed' };
			}
		}),
	encryptFolder: (v, i, p) => core.encryptFolder(v, i, p),
	decryptFolder: (v, i, c) => core.decryptFolder(v, i, c),
	lock: () => core.lock(),
	isUnlocked: core.isUnlocked
};

const scope = self as unknown as DedicatedWorkerGlobalScope;

scope.onmessage = async (event: MessageEvent<EngineRequest>) => {
	const { id, method, args } = event.data;
	let response: EngineResponse;
	try {
		await core.ready();
		const fn = api[method] as (...a: unknown[]) => unknown;
		response = { id, ok: true, result: fn(...args) };
	} catch (err) {
		response = {
			id,
			ok: false,
			code: err instanceof CryptoError ? err.code : 'engine_unavailable'
		};
	}
	scope.postMessage(response);
};
