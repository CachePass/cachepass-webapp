/** Local (client-side) search, filtering and sorting of decrypted items. */
import type { ItemPayload, ItemType } from '#lib/schemas/item.js';

export interface VaultEntry {
	id: string;
	revision: number;
	deletedAt: string | null;
	createdAt: string;
	updatedAt: string;
	data: ItemPayload;
}

export type SortKey = 'name' | 'updated' | 'created';

export interface ItemFilter {
	type?: ItemType | null;
	favorites?: boolean;
	folderId?: string | null;
	trash?: boolean;
	query?: string;
}

/** Text that the local search matches against. Secrets (passwords, card numbers, keys) are excluded. */
export function searchableText(item: ItemPayload): string {
	const parts = [item.name, item.notes];
	switch (item.type) {
		case 'login':
			parts.push(item.login.username, ...item.login.uris);
			break;
		case 'card':
			parts.push(item.card.cardholderName, item.card.brand, item.card.number.slice(-4));
			break;
		case 'identity':
			parts.push(
				item.identity.firstName,
				item.identity.lastName,
				item.identity.email,
				item.identity.company
			);
			break;
		case 'ssh_key':
			parts.push(item.sshKey.fingerprint);
			break;
	}
	for (const f of item.fields) if (!f.hidden) parts.push(f.name, f.value);
	return parts.join('\n').toLowerCase();
}

export function filterItems(entries: VaultEntry[], filter: ItemFilter): VaultEntry[] {
	const terms = (filter.query ?? '').toLowerCase().split(/\s+/).filter(Boolean);
	return entries.filter((e) => {
		if (Boolean(filter.trash) !== (e.deletedAt !== null)) return false;
		if (filter.type && e.data.type !== filter.type) return false;
		if (filter.favorites && !e.data.favorite) return false;
		if (
			filter.folderId !== undefined &&
			filter.folderId !== null &&
			e.data.folderId !== filter.folderId
		)
			return false;
		if (terms.length) {
			const text = searchableText(e.data);
			return terms.every((t) => text.includes(t));
		}
		return true;
	});
}

export function sortItems(entries: VaultEntry[], key: SortKey): VaultEntry[] {
	const copy = [...entries];
	const collator = new Intl.Collator(undefined, { sensitivity: 'base', numeric: true });
	switch (key) {
		case 'name':
			return copy.sort((a, b) => collator.compare(a.data.name, b.data.name));
		case 'updated':
			return copy.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
		case 'created':
			return copy.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
	}
}

/** Short subtitle shown in the item list (never a secret). */
export function itemSubtitle(item: ItemPayload): string {
	switch (item.type) {
		case 'login':
			return item.login.username || item.login.uris.find(Boolean) || '';
		case 'card':
			return item.card.number
				? `•••• ${item.card.number.replace(/\s/g, '').slice(-4)}`
				: item.card.brand;
		case 'identity':
			return (
				[item.identity.firstName, item.identity.lastName].filter(Boolean).join(' ') ||
				item.identity.email
			);
		case 'ssh_key':
			return item.sshKey.fingerprint;
		case 'note':
			return item.notes.split('\n')[0]?.slice(0, 80) ?? '';
	}
}
