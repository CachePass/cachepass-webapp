/**
 * Zod mirrors of the backend DTOs (cachepass-backend/openapi.json). Responses
 * are validated so a misbehaving server cannot inject unexpected shapes.
 */
import { z } from 'zod';

const timestamp = z.string();
const b64 = z.string().regex(/^[A-Za-z0-9_-]*$/);

export const errorBodySchema = z.object({
	error: z.object({
		code: z.string(),
		message: z.string(),
		fields: z.array(z.object({ field: z.string(), message: z.string() })).optional(),
		current_revision: z.number().int().optional()
	})
});

export const accountSchema = z.object({
	id: z.uuid(),
	email: z.string(),
	name: z.string().nullable(),
	email_verified: z.boolean(),
	mfa_enabled: z.boolean(),
	vault_id: z.uuid(),
	created_at: timestamp
});
export type Account = z.infer<typeof accountSchema>;

export const csrfSchema = z.object({ token: z.string() });
export const messageSchema = z.object({ message: z.string() });

export const loginResponseSchema = z.object({
	status: z.enum(['authenticated', 'mfa_required']),
	account: accountSchema.nullable()
});
export type LoginResponse = z.infer<typeof loginResponseSchema>;

export const kdfSchema = z.object({
	algorithm: z.literal('argon2id'),
	memory_kib: z.number().int(),
	iterations: z.number().int(),
	parallelism: z.number().int(),
	salt: b64
});

export const keyEnvelopeSchema = z.object({
	version: z.literal(1),
	kdf: kdfSchema,
	wrapped_key: b64,
	revision: z.number().int()
});
export type KeyEnvelopeResponse = z.infer<typeof keyEnvelopeSchema>;

export const vaultSchema = z.object({
	id: z.uuid(),
	revision: z.number().int(),
	item_count: z.number().int(),
	folder_count: z.number().int(),
	created_at: timestamp,
	updated_at: timestamp
});

export const itemSchema = z.object({
	id: z.uuid(),
	revision: z.number().int(),
	ciphertext: b64,
	deleted_at: timestamp.nullable(),
	created_at: timestamp,
	updated_at: timestamp
});
export type ItemRecord = z.infer<typeof itemSchema>;

export const folderSchema = z.object({
	id: z.uuid(),
	revision: z.number().int(),
	ciphertext: b64,
	created_at: timestamp,
	updated_at: timestamp
});
export type FolderRecord = z.infer<typeof folderSchema>;

export const syncSchema = z.object({
	vault_id: z.uuid(),
	revision: z.number().int(),
	full: z.boolean(),
	items: z.array(itemSchema),
	folders: z.array(folderSchema),
	tombstones: z.array(
		z.object({ type: z.enum(['item', 'folder']), id: z.uuid(), revision: z.number().int() })
	),
	key_revision: z.number().int()
});
export type SyncResponse = z.infer<typeof syncSchema>;

export const sessionSchema = z.object({
	id: z.uuid(),
	device_id: z.uuid().nullable(),
	device_name: z.string().nullable(),
	ip: z.string().nullable(),
	user_agent: z.string().nullable(),
	created_at: timestamp,
	last_seen_at: timestamp,
	expires_at: timestamp,
	current: z.boolean()
});
export type SessionInfo = z.infer<typeof sessionSchema>;

export const deviceSchema = z.object({
	id: z.uuid(),
	name: z.string(),
	user_agent: z.string().nullable(),
	last_ip: z.string().nullable(),
	created_at: timestamp,
	last_seen_at: timestamp,
	active_sessions: z.number().int(),
	current: z.boolean()
});
export type DeviceInfo = z.infer<typeof deviceSchema>;

export const auditPageSchema = z.object({
	entries: z.array(
		z.object({
			id: z.uuid(),
			event: z.string(),
			ip: z.string().nullable(),
			user_agent: z.string().nullable(),
			created_at: timestamp
		})
	),
	next_before: timestamp.nullable()
});
export type AuditPage = z.infer<typeof auditPageSchema>;

export const mfaSetupSchema = z.object({ secret: z.string(), otpauth_uri: z.string() });
export const recoveryCodesSchema = z.object({ recovery_codes: z.array(z.string()) });
