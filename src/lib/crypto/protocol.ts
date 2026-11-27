/** Message protocol between the main thread and the crypto worker. */
import type { CryptoErrorCode, KdfPolicy, KeyEnvelope } from './types';

export interface EngineApi {
	kdfPolicy: () => KdfPolicy;
	createVault: (masterPassword: string) => { vaultId: string; envelope: KeyEnvelope };
	unlock: (masterPassword: string, vaultId: string, envelope: KeyEnvelope) => void;
	verifyMasterPassword: (masterPassword: string, vaultId: string, envelope: KeyEnvelope) => boolean;
	rewrap: (newMasterPassword: string, vaultId: string) => KeyEnvelope;
	encryptItem: (vaultId: string, itemId: string, payload: unknown) => string;
	decryptItem: (vaultId: string, itemId: string, ciphertext: string) => unknown;
	decryptItems: (
		vaultId: string,
		items: { id: string; ciphertext: string }[]
	) => { id: string; payload?: unknown; error?: CryptoErrorCode }[];
	encryptFolder: (vaultId: string, folderId: string, payload: unknown) => string;
	decryptFolder: (vaultId: string, folderId: string, ciphertext: string) => unknown;
	lock: () => void;
	isUnlocked: () => boolean;
}

export type EngineMethod = keyof EngineApi;

export interface EngineRequest {
	id: number;
	method: EngineMethod;
	args: unknown[];
}

export type EngineResponse =
	{ id: number; ok: true; result: unknown } | { id: number; ok: false; code: CryptoErrorCode };
