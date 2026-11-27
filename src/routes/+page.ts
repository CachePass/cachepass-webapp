import { redirect } from '@sveltejs/kit';
import { session } from '#lib/stores/session.svelte.js';
import { vault } from '#lib/stores/vault.svelte.js';

export async function load() {
	const account =
		session.status === 'authenticated'
			? session.account
			: await session.refresh().catch(() => null);
	if (!account) redirect(307, '/login');
	redirect(307, vault.unlocked ? '/vault' : '/unlock');
}
