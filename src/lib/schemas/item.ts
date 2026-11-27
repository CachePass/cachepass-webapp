/**
 * Vault item payload (schema v1). The entire object — including type, name,
 * folder and favourite flag — is encrypted client-side as one JSON document.
 */
import { z } from 'zod';

export const ITEM_TYPES = ['login', 'note', 'card', 'identity', 'ssh_key'] as const;
export type ItemType = (typeof ITEM_TYPES)[number];

const text = (max: number) => z.string().max(max).default('');

export const customFieldSchema = z.object({
	name: z.string().max(100),
	value: z.string().max(5000),
	hidden: z.boolean().default(false)
});

const common = {
	schema: z.literal(1),
	name: z.string().trim().min(1, 'Name is required').max(200),
	folderId: z.uuid().nullable().default(null),
	favorite: z.boolean().default(false),
	notes: text(20_000),
	fields: z.array(customFieldSchema).max(50).default([])
};

export const loginSchema = z.object({
	...common,
	type: z.literal('login'),
	login: z.object({
		username: text(500),
		password: text(5000),
		uris: z.array(z.string().trim().max(2000)).max(20).default([]),
		totp: text(2000)
	})
});

export const noteSchema = z.object({ ...common, type: z.literal('note') });

export const cardSchema = z.object({
	...common,
	type: z.literal('card'),
	card: z.object({
		cardholderName: text(200),
		number: text(32),
		brand: text(50),
		expMonth: text(2),
		expYear: text(4),
		code: text(8)
	})
});

export const identitySchema = z.object({
	...common,
	type: z.literal('identity'),
	identity: z.object({
		title: text(50),
		firstName: text(100),
		middleName: text(100),
		lastName: text(100),
		email: text(254),
		phone: text(50),
		company: text(200),
		address1: text(200),
		address2: text(200),
		city: text(100),
		state: text(100),
		postalCode: text(20),
		country: text(100)
	})
});

export const sshKeySchema = z.object({
	...common,
	type: z.literal('ssh_key'),
	sshKey: z.object({
		publicKey: text(20_000),
		privateKey: text(50_000),
		fingerprint: text(200),
		passphrase: text(1000)
	})
});

export const itemPayloadSchema = z.discriminatedUnion('type', [
	loginSchema,
	noteSchema,
	cardSchema,
	identitySchema,
	sshKeySchema
]);

export type ItemPayload = z.infer<typeof itemPayloadSchema>;
export type LoginItem = z.infer<typeof loginSchema>;
export type CardItem = z.infer<typeof cardSchema>;
export type IdentityItem = z.infer<typeof identitySchema>;
export type SshKeyItem = z.infer<typeof sshKeySchema>;
export type CustomField = z.infer<typeof customFieldSchema>;

export const folderPayloadSchema = z.object({
	schema: z.literal(1),
	name: z.string().trim().min(1, 'Name is required').max(100)
});
export type FolderPayload = z.infer<typeof folderPayloadSchema>;

export const ITEM_TYPE_LABELS: Record<ItemType, { singular: string; plural: string }> = {
	login: { singular: 'Login', plural: 'Logins' },
	note: { singular: 'Secure note', plural: 'Secure notes' },
	card: { singular: 'Card', plural: 'Cards' },
	identity: { singular: 'Identity', plural: 'Identities' },
	ssh_key: { singular: 'SSH key', plural: 'SSH keys' }
};

/** An empty payload of the given type, ready for the editor. */
export function emptyItem(type: ItemType, folderId: string | null = null): ItemPayload {
	const base = { schema: 1 as const, name: '', folderId, favorite: false, notes: '', fields: [] };
	switch (type) {
		case 'login':
			return { ...base, type, login: { username: '', password: '', uris: [''], totp: '' } };
		case 'note':
			return { ...base, type };
		case 'card':
			return {
				...base,
				type,
				card: { cardholderName: '', number: '', brand: '', expMonth: '', expYear: '', code: '' }
			};
		case 'identity':
			return {
				...base,
				type,
				identity: {
					title: '',
					firstName: '',
					middleName: '',
					lastName: '',
					email: '',
					phone: '',
					company: '',
					address1: '',
					address2: '',
					city: '',
					state: '',
					postalCode: '',
					country: ''
				}
			};
		case 'ssh_key':
			return {
				...base,
				type,
				sshKey: { publicKey: '', privateKey: '', fingerprint: '', passphrase: '' }
			};
	}
}
