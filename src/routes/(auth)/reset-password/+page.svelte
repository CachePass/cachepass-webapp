<script lang="ts">
	import { resolve } from '$app/paths';
	import { onMount } from 'svelte';
	import { api } from '#lib/api/index.js';
	import AuthShell from '#lib/components/auth/AuthShell.svelte';
	import Field from '#lib/components/shared/Field.svelte';
	import FormAlert from '#lib/components/shared/FormAlert.svelte';
	import PasswordInput from '#lib/components/shared/PasswordInput.svelte';
	import { Button } from '#lib/components/ui/button/index.js';
	import { validateAccountPassword } from '#lib/features/authentication/validation.js';
	import { errorMessage } from '#lib/utils/errors.js';
	import { takeFragmentToken } from '#lib/utils/fragment.js';

	let token = $state<string | null>(null);
	let ready = $state(false);
	let password = $state('');
	let confirm = $state('');
	let fieldError = $state<string | undefined>();
	let error = $state<string | null>(null);
	let done = $state<string | null>(null);
	let busy = $state(false);

	onMount(() => {
		token = takeFragmentToken();
		ready = true;
	});

	async function submit(event: SubmitEvent) {
		event.preventDefault();
		fieldError =
			validateAccountPassword(password) ??
			(password !== confirm ? 'Passwords do not match.' : undefined);
		if (fieldError || !token) return;
		busy = true;
		error = null;
		try {
			done = (await api.auth.resetPassword(token, password)).message;
			password = confirm = '';
		} catch (err) {
			error = errorMessage(err);
		} finally {
			busy = false;
		}
	}
</script>

<AuthShell title="Choose a new account password">
	{#if done}
		<FormAlert variant="info"><p>{done}</p></FormAlert>
		<Button href={resolve('login')} class="mt-4 w-full">Sign in</Button>
	{:else if ready && !token}
		<FormAlert><p>This reset link is invalid or incomplete. Request a new one.</p></FormAlert>
		<Button href={resolve('forgot-password')} variant="outline" class="mt-4 w-full">
			Request a new link
		</Button>
	{:else}
		<form class="space-y-4" onsubmit={submit}>
			{#if error}<FormAlert><p>{error}</p></FormAlert>{/if}
			<p class="text-sm text-muted-foreground">
				All existing sessions will be signed out. Your vault and master password are not affected.
				Do not reuse your master password here: the account password is sent to the server.
			</p>
			<Field id="password" label="New account password" error={fieldError}>
				<PasswordInput
					id="password"
					autocomplete="new-password"
					bind:value={password}
					aria-invalid={!!fieldError}
				/>
			</Field>
			<Field id="confirm" label="Confirm new password">
				<PasswordInput id="confirm" autocomplete="new-password" bind:value={confirm} />
			</Field>
			<Button type="submit" class="w-full" disabled={busy}>
				{busy ? 'Saving…' : 'Set new password'}
			</Button>
		</form>
	{/if}
</AuthShell>
