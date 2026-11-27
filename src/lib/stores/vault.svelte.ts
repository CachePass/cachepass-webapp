/**
 * Unlocked vault state. Decrypted items live ONLY here, in memory, and are
 * dropped on lock. All encryption/decryption happens in the crypto worker.
 */
import { SvelteMap } from 'svelte/reactivity';
import {
	api,
	ApiError,
	type KeyEnvelopeResponse,
	type ItemRecord,
	type FolderRecord,
	type SyncResponse
} from '#lib/api/index.js';
import {
	CryptoError,
	destroyEngine,
	engine,
	newUuid,
	type KeyEnvelope
} from '#lib/crypto/index.js';
import { clearClipboardNow } from '#lib/features/vault/clipboard.js';
import type { VaultEntry } from '#lib/features/vault/search.js';
import { folderPayloadSchema, itemPayloadSchema, type ItemPayload } from '#lib/schemas/item.js';

export interface FolderEntry {
	id: string;
	revision: number;
	name: string;
}

/** Thrown when the server rejected a write because another client changed the object. */
export class ConflictError extends Error {
	constructor() {
		super(
			'This item was changed on another device. The latest version has been loaded; review it and try again.'
		);
		this.name = 'ConflictError';
	}
}

function envelopeOf(e: KeyEnvelopeResponse): KeyEnvelope {
	return { version: e.version, kdf: e.kdf, wrapped_key: e.wrapped_key };
}

class VaultStore {
	unlocked = $state(false);
	vaultId = $state<string | null>(null);
	revision = $state(0);
	syncing = $state(false);
	lastSyncedAt = $state<Date | null>(null);
	entries = new SvelteMap<string, VaultEntry>();
	folders = new SvelteMap<string, FolderEntry>();
	/** Ids whose ciphertext failed to decrypt or validate (tampering or a newer schema). */
	undecryptable = $state<string[]>([]);
	private envelope: KeyEnvelopeResponse | null = null;
	private keyRevision = 0;
	/** Incremented on every lock. Async work started under an older generation must not write state. */
	private generation = 0;

	/** Derive keys locally from the master password and load the vault. */
	async unlock(masterPassword: string, vaultId: string): Promise<void> {
		const gen = this.generation;
		const envelope = await api.vault.keyEnvelope();
		await engine.unlock(masterPassword, vaultId, envelopeOf(envelope));
		if (gen !== this.generation) throw new CryptoError('locked');
		this.envelope = envelope;
		this.keyRevision = envelope.revision;
		this.vaultId = vaultId;
		this.unlocked = true;
		try {
			await this.sync(true);
		} catch (err) {
			await this.lock();
			throw err;
		}
	}

	/** Lock: destroy the crypto worker (and with it the vault key) and drop all plaintext. */
	async lock(): Promise<void> {
		this.generation++;
		this.unlocked = false;
		this.entries.clear();
		this.folders.clear();
		this.undecryptable = [];
		this.envelope = null;
		this.vaultId = null;
		this.revision = 0;
		this.lastSyncedAt = null;
		await clearClipboardNow();
		await destroyEngine();
	}

	/** Throw if the vault was locked (or re-unlocked) since `gen` was captured. */
	private assertCurrent(gen: number): void {
		if (gen !== this.generation || !this.unlocked) throw new CryptoError('locked');
	}

	private requireVault(): string {
		if (!this.unlocked || !this.vaultId) throw new CryptoError('locked');
		return this.vaultId;
	}

	async sync(full = false): Promise<void> {
		const vaultId = this.requireVault();
		const gen = this.generation;
		this.syncing = true;
		try {
			const res = await api.vault.sync(full ? undefined : this.revision);
			this.assertCurrent(gen);
			if (res.vault_id !== vaultId) throw new CryptoError('malformed_envelope');
			await this.apply(vaultId, res, gen);
		} finally {
			this.syncing = false;
		}
	}

	private async apply(vaultId: string, res: SyncResponse, gen: number): Promise<void> {
		if (res.full) {
			this.entries.clear();
			this.folders.clear();
			this.undecryptable = [];
		}
		for (const t of res.tombstones) {
			if (t.type === 'item') this.entries.delete(t.id);
			else this.folders.delete(t.id);
		}
		await this.ingestItems(vaultId, res.items, gen);
		for (const f of res.folders) await this.ingestFolder(vaultId, f, gen);
		this.revision = res.revision;
		if (res.key_revision !== this.keyRevision) {
			this.envelope = await api.vault.keyEnvelope();
			this.keyRevision = this.envelope.revision;
		}
		this.lastSyncedAt = new Date();
	}

	private async ingestItems(vaultId: string, records: ItemRecord[], gen: number): Promise<void> {
		if (records.length === 0) return;
		const results = await engine.decryptItems(
			vaultId,
			records.map((r) => ({ id: r.id, ciphertext: r.ciphertext }))
		);
		this.assertCurrent(gen);
		// Local scratch set, not reactive state: the result is assigned to $state below.
		// eslint-disable-next-line svelte/prefer-svelte-reactivity
		const bad = new Set(this.undecryptable);
		records.forEach((record, i) => {
			const parsed = results[i].error ? null : itemPayloadSchema.safeParse(results[i].payload);
			if (parsed?.success) {
				bad.delete(record.id);
				this.entries.set(record.id, toEntry(record, parsed.data));
			} else {
				bad.add(record.id);
				this.entries.delete(record.id);
			}
		});
		this.undecryptable = [...bad];
	}

	private async ingestFolder(vaultId: string, record: FolderRecord, gen: number): Promise<void> {
		let name = 'Unreadable folder';
		try {
			name = folderPayloadSchema.parse(
				await engine.decryptFolder(vaultId, record.id, record.ciphertext)
			).name;
		} catch {
			/* tampered or unreadable: shown with a placeholder name */
		}
		this.assertCurrent(gen);
		this.folders.set(record.id, { id: record.id, revision: record.revision, name });
	}

	private async onConflict<T>(fn: () => Promise<T>): Promise<T> {
		try {
			return await fn();
		} catch (err) {
			if (err instanceof ApiError && err.code === 'revision_conflict') {
				await this.sync();
				throw new ConflictError();
			}
			throw err;
		}
	}

	async createItem(payload: ItemPayload): Promise<string> {
		const vaultId = this.requireVault();
		const gen = this.generation;
		const data = itemPayloadSchema.parse(payload);
		const id = newUuid();
		const ciphertext = await engine.encryptItem(vaultId, id, data);
		const record = await api.vault.createItem(id, ciphertext);
		this.assertCurrent(gen);
		this.entries.set(id, toEntry(record, data));
		return id;
	}

	async updateItem(id: string, payload: ItemPayload): Promise<void> {
		const vaultId = this.requireVault();
		const gen = this.generation;
		const current = this.entries.get(id);
		if (!current) throw new ApiError(404, 'not_found', 'Item not found.');
		const data = itemPayloadSchema.parse(payload);
		const ciphertext = await engine.encryptItem(vaultId, id, data);
		const record = await this.onConflict(() =>
			api.vault.updateItem(id, current.revision, ciphertext)
		);
		this.assertCurrent(gen);
		this.entries.set(id, toEntry(record, data));
	}

	async toggleFavorite(id: string): Promise<void> {
		const entry = this.entries.get(id);
		if (entry) await this.updateItem(id, { ...entry.data, favorite: !entry.data.favorite });
	}

	async duplicate(id: string): Promise<string> {
		const entry = this.entries.get(id);
		if (!entry) throw new ApiError(404, 'not_found', 'Item not found.');
		return this.createItem({
			...structuredClone($state.snapshot(entry.data)),
			name: `${entry.data.name} (copy)`,
			favorite: false
		});
	}

	async trash(id: string): Promise<void> {
		const gen = this.generation;
		const entry = this.entries.get(id);
		if (!entry) return;
		const record = await this.onConflict(() => api.vault.trashItem(id, entry.revision));
		this.assertCurrent(gen);
		this.entries.set(id, toEntry(record, entry.data));
	}

	async restore(id: string): Promise<void> {
		const gen = this.generation;
		const entry = this.entries.get(id);
		if (!entry) return;
		const record = await this.onConflict(() => api.vault.restoreItem(id, entry.revision));
		this.assertCurrent(gen);
		this.entries.set(id, toEntry(record, entry.data));
	}

	async purge(id: string): Promise<void> {
		const gen = this.generation;
		const entry = this.entries.get(id);
		if (!entry) return;
		await this.onConflict(() => api.vault.purgeItem(id, entry.revision));
		this.assertCurrent(gen);
		this.entries.delete(id);
	}

	async createFolder(name: string): Promise<string> {
		const vaultId = this.requireVault();
		const gen = this.generation;
		const payload = folderPayloadSchema.parse({ schema: 1, name });
		const id = newUuid();
		const record = await api.folders.create(id, await engine.encryptFolder(vaultId, id, payload));
		this.assertCurrent(gen);
		this.folders.set(id, { id, revision: record.revision, name: payload.name });
		return id;
	}

	async renameFolder(id: string, name: string): Promise<void> {
		const vaultId = this.requireVault();
		const gen = this.generation;
		const folder = this.folders.get(id);
		if (!folder) return;
		const payload = folderPayloadSchema.parse({ schema: 1, name });
		const ciphertext = await engine.encryptFolder(vaultId, id, payload);
		const record = await this.onConflict(() => api.folders.update(id, folder.revision, ciphertext));
		this.assertCurrent(gen);
		this.folders.set(id, { id, revision: record.revision, name: payload.name });
	}

	/** Delete a folder and move its items to "no folder" (re-encrypting them). */
	async deleteFolder(id: string): Promise<void> {
		const gen = this.generation;
		const folder = this.folders.get(id);
		if (!folder) return;
		await this.onConflict(() => api.folders.remove(id, folder.revision));
		this.assertCurrent(gen);
		this.folders.delete(id);
		for (const entry of [...this.entries.values()].filter((e) => e.data.folderId === id)) {
			await this.updateItem(entry.id, { ...entry.data, folderId: null });
		}
	}

	/** Verify the master password without changing state (re-authentication for sensitive actions). */
	async verifyMasterPassword(masterPassword: string): Promise<boolean> {
		const vaultId = this.requireVault();
		if (!this.envelope) this.envelope = await api.vault.keyEnvelope();
		return engine.verifyMasterPassword(masterPassword, vaultId, envelopeOf(this.envelope));
	}

	/** Re-wrap the vault key under a new master password (items are not re-encrypted). */
	async changeMasterPassword(
		current: string,
		next: string,
		accountPassword: string,
		code?: string
	): Promise<void> {
		const vaultId = this.requireVault();
		const gen = this.generation;
		if (!(await this.verifyMasterPassword(current))) throw new CryptoError('decryption_failed');
		const envelope = await engine.rewrap(next, vaultId);
		const expected = this.envelope?.revision ?? this.keyRevision;
		const updated = await api.vault.putKeyEnvelope(expected, envelope, accountPassword, code);
		this.assertCurrent(gen);
		this.envelope = updated;
		this.keyRevision = this.envelope.revision;
	}

	get list(): VaultEntry[] {
		return [...this.entries.values()];
	}
}

function toEntry(record: ItemRecord, data: ItemPayload): VaultEntry {
	return {
		id: record.id,
		revision: record.revision,
		deletedAt: record.deleted_at,
		createdAt: record.created_at,
		updatedAt: record.updated_at,
		data
	};
}

export const vault = new VaultStore();
