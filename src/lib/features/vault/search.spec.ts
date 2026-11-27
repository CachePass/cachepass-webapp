import { describe, expect, it } from 'vitest';
import { emptyItem, type ItemPayload } from '#lib/schemas/item.js';
import { filterItems, itemSubtitle, searchableText, sortItems, type VaultEntry } from './search';

function entry(id: string, data: ItemPayload, extra: Partial<VaultEntry> = {}): VaultEntry {
	return {
		id,
		revision: 1,
		deletedAt: null,
		createdAt: '2026-01-01',
		updatedAt: '2026-01-01',
		data,
		...extra
	};
}

const login = {
	...emptyItem('login'),
	name: 'GitHub',
	login: { username: 'octo', password: 'hunter2', uris: ['https://github.com'], totp: '' }
} as ItemPayload;
const note = {
	...emptyItem('note'),
	name: 'Recovery plan',
	notes: 'call bank',
	favorite: true
} as ItemPayload;
const card = {
	...emptyItem('card'),
	name: 'Visa',
	card: {
		cardholderName: 'A',
		number: '4111 1111 1111 1234',
		brand: 'Visa',
		expMonth: '01',
		expYear: '2030',
		code: '999'
	}
} as ItemPayload;

const items = [
	entry('a', login, { updatedAt: '2026-03-01' }),
	entry('b', note, { updatedAt: '2026-02-01' }),
	entry('c', card, { deletedAt: '2026-04-01' })
];

describe('local search', () => {
	it('never indexes secrets', () => {
		expect(searchableText(login)).not.toContain('hunter2');
		expect(searchableText(card)).not.toContain('999');
		expect(searchableText(card)).not.toContain('4111');
	});

	it('filters by query terms, type, favourites and trash', () => {
		expect(filterItems(items, { query: 'git octo' }).map((e) => e.id)).toEqual(['a']);
		expect(filterItems(items, { query: 'hunter2' })).toEqual([]);
		expect(filterItems(items, { type: 'note' }).map((e) => e.id)).toEqual(['b']);
		expect(filterItems(items, { favorites: true }).map((e) => e.id)).toEqual(['b']);
		expect(filterItems(items, { trash: true }).map((e) => e.id)).toEqual(['c']);
		expect(filterItems(items, {}).map((e) => e.id)).toEqual(['a', 'b']);
	});

	it('sorts by name and update time', () => {
		expect(sortItems(items, 'name').map((e) => e.data.name)).toEqual([
			'GitHub',
			'Recovery plan',
			'Visa'
		]);
		expect(sortItems(items, 'updated')[0].id).toBe('a');
	});

	it('builds non-secret subtitles', () => {
		expect(itemSubtitle(login)).toBe('octo');
		expect(itemSubtitle(card)).toBe('•••• 1234');
	});
});
