import { resolve } from '$app/paths';
/** App-level actions shared by the sidebar, command palette and shortcuts. */
import { goto } from '$app/navigation';
import { api, resetCsrf } from '#lib/api/index.js';
import { session } from '#lib/stores/session.svelte.js';
import { ui } from '#lib/stores/ui.svelte.js';
import { vault } from '#lib/stores/vault.svelte.js';

export async function lockVault(): Promise<void> {
	ui.reset();
	await vault.lock();
	await goto(resolve('unlock'));
}

export async function signOut(): Promise<void> {
	ui.reset();
	await vault.lock();
	await api.auth.logout().catch(() => undefined);
	resetCsrf();
	session.clear();
	await goto(resolve('login'));
}

/** Session expired or revoked server-side: drop everything and go to sign-in. */
export async function handleSessionExpired(): Promise<void> {
	ui.reset();
	await vault.lock();
	resetCsrf();
	session.clear();
	await goto(resolve('login?expired=1'));
}
