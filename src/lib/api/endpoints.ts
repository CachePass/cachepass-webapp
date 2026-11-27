/** Typed endpoint functions, one per backend route. */
import type { KeyEnvelope } from '#lib/crypto/index.js';
import { request } from './client';
import * as s from './schemas';

export const auth = {
	register: (body: {
		email: string;
		password: string;
		vault_id: string;
		key_envelope: KeyEnvelope;
	}) => request('POST', '/auth/register', s.messageSchema, body),
	login: (email: string, password: string) =>
		request('POST', '/auth/login', s.loginResponseSchema, { email, password }, { quiet401: true }),
	loginMfa: (code: string) =>
		request('POST', '/auth/login/mfa', s.loginResponseSchema, { code }, { quiet401: true }),
	logout: () => request('POST', '/auth/logout', null, {}, { quiet401: true }),
	logoutAll: () => request('POST', '/auth/logout-all', null, {}),
	verifyEmail: (token: string) => request('POST', '/auth/verify-email', s.messageSchema, { token }),
	resendVerification: (email: string) =>
		request('POST', '/auth/resend-verification', s.messageSchema, { email }),
	forgotPassword: (email: string) =>
		request('POST', '/auth/forgot-password', s.messageSchema, { email }),
	resetPassword: (token: string, password: string) =>
		request('POST', '/auth/reset-password', s.messageSchema, { token, password }),
	changePassword: (current_password: string, new_password: string) =>
		request('POST', '/auth/change-password', s.messageSchema, { current_password, new_password }),
	me: (quiet401 = true) => request('GET', '/auth/me', s.accountSchema, undefined, { quiet401 }),
	mfaSetup: (password: string) =>
		request('POST', '/auth/mfa/totp/setup', s.mfaSetupSchema, { password }),
	mfaEnable: (code: string) =>
		request('POST', '/auth/mfa/totp/enable', s.recoveryCodesSchema, { code }),
	mfaDisable: (password: string, code: string) =>
		request('POST', '/auth/mfa/totp/disable', null, { password, code }),
	mfaRecoveryCodes: (password: string, code: string) =>
		request('POST', '/auth/mfa/recovery-codes', s.recoveryCodesSchema, { password, code })
};

export const vault = {
	get: () => request('GET', '/vault', s.vaultSchema),
	keyEnvelope: () => request('GET', '/vault/key-envelope', s.keyEnvelopeSchema),
	putKeyEnvelope: (expected_revision: number, envelope: KeyEnvelope) =>
		request('PUT', '/vault/key-envelope', s.keyEnvelopeSchema, { expected_revision, envelope }),
	sync: (since?: number) =>
		request('GET', '/vault/sync', s.syncSchema, undefined, { query: { since } }),
	createItem: (id: string, ciphertext: string) =>
		request('POST', '/vault/items', s.itemSchema, { id, ciphertext }),
	updateItem: (id: string, revision: number, ciphertext: string) =>
		request('PUT', `/vault/items/${id}`, s.itemSchema, { revision, ciphertext }),
	trashItem: (id: string, revision: number) =>
		request('DELETE', `/vault/items/${id}`, s.itemSchema, undefined, { query: { revision } }),
	purgeItem: (id: string, revision: number) =>
		request('DELETE', `/vault/items/${id}`, null, undefined, {
			query: { revision, permanent: true }
		}),
	restoreItem: (id: string, revision: number) =>
		request('POST', `/vault/items/${id}/restore`, s.itemSchema, { revision })
};

export const folders = {
	create: (id: string, ciphertext: string) =>
		request('POST', '/folders', s.folderSchema, { id, ciphertext }),
	update: (id: string, revision: number, ciphertext: string) =>
		request('PUT', `/folders/${id}`, s.folderSchema, { revision, ciphertext }),
	remove: (id: string, revision: number) =>
		request('DELETE', `/folders/${id}`, null, undefined, { query: { revision } })
};

export const account = {
	get: () => request('GET', '/account', s.accountSchema),
	update: (name: string | null) => request('PATCH', '/account', s.accountSchema, { name }),
	remove: (password: string, code?: string) =>
		request('DELETE', '/account', null, { password, code })
};

export const sessions = {
	list: () => request('GET', '/sessions', s.sessionSchema.array()),
	revoke: (id: string) => request('DELETE', `/sessions/${id}`, null)
};

export const devices = {
	list: () => request('GET', '/devices', s.deviceSchema.array()),
	remove: (id: string) => request('DELETE', `/devices/${id}`, null)
};

export const audit = {
	list: (before?: string) =>
		request('GET', '/audit-logs', s.auditPageSchema, undefined, { query: { before, limit: 50 } })
};
