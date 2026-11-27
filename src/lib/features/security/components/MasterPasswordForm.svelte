<script lang="ts">
	import { toast } from 'svelte-sonner';
	import Field from '#lib/components/shared/Field.svelte';
	import FormAlert from '#lib/components/shared/FormAlert.svelte';
	import PasswordInput from '#lib/components/shared/PasswordInput.svelte';
	import PasswordStrength from '#lib/components/shared/PasswordStrength.svelte';
	import { Button } from '#lib/components/ui/button/index.js';
	import { Input } from '#lib/components/ui/input/index.js';
	import { session } from '#lib/stores/session.svelte.js';
	import { validateMasterPassword } from '#lib/features/authentication/validation.js';
	import { vault } from '#lib/stores/vault.svelte.js';
	import { errorMessage } from '#lib/utils/errors.js';
	import Panel from './Panel.svelte';

	let current = $state('');
	let next = $state('');
	let confirm = $state('');
	let accountPassword = $state('');
	let code = $state('');
	let fieldError = $state<string | undefined>();
	let error = $state<string | null>(null);
	let busy = $state(false);

	async function submit(event: SubmitEvent) {
		event.preventDefault();
		fieldError =
			validateMasterPassword(next, accountPassword) ??
			(next !== confirm ? 'Master passwords do not match.' : undefined);
		if (!fieldError && next === current) fieldError = 'Choose a different master password.';
		if (fieldError) return;
		busy = true;
		error = null;
		try {
			await vault.changeMasterPassword(current, next, accountPassword, code);
			current = next = confirm = accountPassword = code = '';
			toast.success('Master password changed', {
				description: 'Use the new master password the next time you unlock.'
			});
		} catch (err) {
			error = errorMessage(err);
		} finally {
			busy = false;
		}
	}
</script>

<Panel
	id="master-password"
	title="Master password"
	description="Re-wraps your vault key on this device with a fresh salt. Items are not re-encrypted."
>
	<form class="space-y-4" onsubmit={submit}>
		{#if error}<FormAlert><p>{error}</p></FormAlert>{/if}
		<FormAlert variant="warning">
			<p>
				There is no way to recover a forgotten master password. Make sure you will remember the new
				one.
			</p>
		</FormAlert>
		<Field id="mp-current" label="Current master password">
			<PasswordInput id="mp-current" autocomplete="off" required bind:value={current} />
		</Field>
		<Field id="mp-new" label="New master password" error={fieldError}>
			<PasswordInput
				id="mp-new"
				autocomplete="off"
				required
				bind:value={next}
				aria-invalid={!!fieldError}
			/>
		</Field>
		<PasswordStrength password={next} />
		<Field id="mp-confirm" label="Confirm new master password">
			<PasswordInput id="mp-confirm" autocomplete="off" required bind:value={confirm} />
		</Field>
		<Field
			id="mp-account"
			label="Account password"
			hint="Replacing the vault key envelope also requires your sign-in password."
		>
			<PasswordInput
				id="mp-account"
				autocomplete="current-password"
				required
				bind:value={accountPassword}
			/>
		</Field>
		{#if session.account?.mfa_enabled}
			<Field id="mp-code" label="Two-factor code">
				<Input
					id="mp-code"
					autocomplete="one-time-code"
					class="font-secret"
					required
					bind:value={code}
				/>
			</Field>
		{/if}
		<Button type="submit" disabled={busy || !current || !next || !accountPassword}>
			{busy ? 'Deriving keys…' : 'Change master password'}
		</Button>
	</form>
</Panel>
