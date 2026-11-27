import { redirect } from '@sveltejs/kit';
import { session } from '#lib/stores/session.svelte.js';
import { vault } from '#lib/stores/vault.svelte.js';
import type { LayoutLoad } from './$types';

/** Guard: signed in AND vault unlocked, otherwise redirect. */
export const load: LayoutLoad = async ({ url }) => {
	const account =
		session.status === 'authenticated'
			? session.account
			: await session.refresh().catch(() => null);
	if (!account) redirect(307, '/login');
	if (!vault.unlocked)
		redirect(307, `/unlock?next=${encodeURIComponent(url.pathname + url.search)}`);
	return {};
};
