<script lang="ts">
	import { resolve } from '$app/paths';
	import { api } from '#lib/api/index.js';
	import AuthShell from '#lib/components/auth/AuthShell.svelte';
	import Field from '#lib/components/shared/Field.svelte';
	import FormAlert from '#lib/components/shared/FormAlert.svelte';
	import { Button } from '#lib/components/ui/button/index.js';
	import { Input } from '#lib/components/ui/input/index.js';
	import { errorMessage } from '#lib/utils/errors.js';

	let email = $state('');
	let sent = $state<string | null>(null);
	let error = $state<string | null>(null);
	let busy = $state(false);

	async function submit(event: SubmitEvent) {
		event.preventDefault();
		busy = true;
		error = null;
		try {
			sent = (await api.auth.forgotPassword(email)).message;
		} catch (err) {
			error = errorMessage(err);
		} finally {
			busy = false;
		}
	}
</script>

<AuthShell
	title="Reset account password"
	description="We will email you a link to choose a new account password."
>
	<div class="space-y-4">
		<FormAlert variant="warning">
			<p>
				This resets the password you <strong>sign in</strong> with. It does not reset your master password
				and cannot decrypt your vault.
			</p>
		</FormAlert>
		{#if sent}
			<FormAlert variant="info"><p>{sent}</p></FormAlert>
		{:else}
			<form class="space-y-4" onsubmit={submit}>
				{#if error}<FormAlert><p>{error}</p></FormAlert>{/if}
				<Field id="email" label="Email">
					<Input id="email" type="email" required autocomplete="email" bind:value={email} />
				</Field>
				<Button type="submit" class="w-full" disabled={busy}>
					{busy ? 'Sending…' : 'Send reset link'}
				</Button>
			</form>
		{/if}
	</div>
	{#snippet footer()}
		<a href={resolve('login')} class="hover:underline">Back to sign in</a>
	{/snippet}
</AuthShell>
