<script lang="ts">
	import type { ResolvedPathname } from '$app/types';
	import { resolve } from '$app/paths';
	import LockKeyholeIcon from '@lucide/svelte/icons/lock-keyhole';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { api, resetCsrf } from '#lib/api/index.js';
	import AuthShell from '#lib/components/auth/AuthShell.svelte';
	import FormAlert from '#lib/components/shared/FormAlert.svelte';
	import PasswordInput from '#lib/components/shared/PasswordInput.svelte';
	import { Button } from '#lib/components/ui/button/index.js';
	import { Label } from '#lib/components/ui/label/index.js';
	import { session } from '#lib/stores/session.svelte.js';
	import { vault } from '#lib/stores/vault.svelte.js';
	import { errorMessage } from '#lib/utils/errors.js';

	let masterPassword = $state('');
	let error = $state<string | null>(null);
	let busy = $state(false);
	let input = $state<HTMLInputElement | null>(null);

	$effect(() => input?.focus());

	const APP_PREFIXES = [
		'/vault',
		'/favorites',
		'/trash',
		'/folders',
		'/generator',
		'/security',
		'/settings'
	];

	/** Only return to known in-app routes (prevents open redirects via ?next=). */
	function safeNext(): ResolvedPathname {
		const next = page.url.searchParams.get('next') ?? '';
		const ok = APP_PREFIXES.some(
			(p) => next === p || next.startsWith(`${p}/`) || next.startsWith(`${p}?`)
		);
		return ok && !next.includes('//') ? (next as ResolvedPathname) : resolve('vault');
	}

	async function unlock(event: SubmitEvent) {
		event.preventDefault();
		const account = session.account;
		if (!account) return goto(resolve('login'));
		busy = true;
		error = null;
		try {
			await vault.unlock(masterPassword, account.vault_id);
			masterPassword = '';
			await goto(safeNext(), { replaceState: true });
		} catch (err) {
			masterPassword = '';
			error = errorMessage(err);
			input?.focus();
		} finally {
			busy = false;
		}
	}

	async function signOut() {
		await vault.lock();
		await api.auth.logout().catch(() => undefined);
		resetCsrf();
		session.clear();
		await goto(resolve('login'));
	}
</script>

<AuthShell
	title="Unlock your vault"
	description="Your master password is used on this device only to decrypt your vault."
>
	<form class="space-y-4" onsubmit={unlock}>
		<div class="flex items-center gap-3 rounded-lg bg-muted/60 px-3 py-2.5">
			<div class="flex size-8 items-center justify-center rounded-md bg-background">
				<LockKeyholeIcon class="size-4" />
			</div>
			<div class="min-w-0 text-sm">
				<p class="truncate font-medium">{session.account?.email}</p>
				<p class="text-xs text-muted-foreground">Signed in · vault locked</p>
			</div>
		</div>
		{#if error}<FormAlert><p>{error}</p></FormAlert>{/if}
		<div class="space-y-1.5">
			<Label for="master">Master password</Label>
			<PasswordInput
				id="master"
				autocomplete="off"
				required
				bind:ref={input}
				bind:value={masterPassword}
				disabled={busy}
			/>
		</div>
		<Button type="submit" class="w-full" disabled={busy || !masterPassword}>
			{busy ? 'Deriving key…' : 'Unlock'}
		</Button>
	</form>
	{#snippet footer()}
		<button type="button" class="hover:underline" onclick={signOut}>Sign out</button>
	{/snippet}
</AuthShell>
