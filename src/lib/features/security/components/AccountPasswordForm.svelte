<script lang="ts">
	import { toast } from 'svelte-sonner';
	import { api } from '#lib/api/index.js';
	import Field from '#lib/components/shared/Field.svelte';
	import FormAlert from '#lib/components/shared/FormAlert.svelte';
	import PasswordInput from '#lib/components/shared/PasswordInput.svelte';
	import { Button } from '#lib/components/ui/button/index.js';
	import { validateAccountPassword } from '#lib/features/authentication/validation.js';
	import { vault } from '#lib/stores/vault.svelte.js';
	import { errorMessage } from '#lib/utils/errors.js';
	import Panel from './Panel.svelte';

	let { onchanged }: { onchanged?: () => void } = $props();
	let current = $state('');
	let next = $state('');
	let confirm = $state('');
	let fieldError = $state<string | undefined>();
	let error = $state<string | null>(null);
	let busy = $state(false);

	async function submit(event: SubmitEvent) {
		event.preventDefault();
		fieldError =
			validateAccountPassword(next) ?? (next !== confirm ? 'Passwords do not match.' : undefined);
		if (fieldError) return;
		busy = true;
		error = null;
		try {
			// The server sees the account password; it must never be the master password.
			// Checked locally by trying to unwrap the vault key with it.
			if (await vault.verifyMasterPassword(next)) {
				fieldError =
					'This is your master password. The account password is sent to the server, so it must be different.';
				return;
			}
			const res = await api.auth.changePassword(current, next);
			current = next = confirm = '';
			toast.success(res.message);
			onchanged?.();
		} catch (err) {
			error = errorMessage(err);
		} finally {
			busy = false;
		}
	}
</script>

<Panel
	id="account-password"
	title="Account password"
	description="Used to sign in. Changing it signs out your other sessions. It does not affect vault encryption."
>
	<form class="space-y-4" onsubmit={submit}>
		{#if error}<FormAlert><p>{error}</p></FormAlert>{/if}
		<Field id="ap-current" label="Current account password">
			<PasswordInput
				id="ap-current"
				autocomplete="current-password"
				required
				bind:value={current}
			/>
		</Field>
		<Field
			id="ap-new"
			label="New account password"
			error={fieldError}
			hint="At least 12 characters. Must not be your master password."
		>
			<PasswordInput
				id="ap-new"
				autocomplete="new-password"
				required
				bind:value={next}
				aria-invalid={!!fieldError}
			/>
		</Field>
		<Field id="ap-confirm" label="Confirm new account password">
			<PasswordInput id="ap-confirm" autocomplete="new-password" required bind:value={confirm} />
		</Field>
		<Button type="submit" disabled={busy || !current || !next}>
			{busy ? 'Saving…' : 'Change account password'}
		</Button>
	</form>
</Panel>
