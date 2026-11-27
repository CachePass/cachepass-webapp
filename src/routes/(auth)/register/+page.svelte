<script lang="ts">
	import { resolve } from '$app/paths';
	import TriangleAlertIcon from '@lucide/svelte/icons/triangle-alert';
	import { api, ApiError } from '#lib/api/index.js';
	import AuthShell from '#lib/components/auth/AuthShell.svelte';
	import Field from '#lib/components/shared/Field.svelte';
	import FormAlert from '#lib/components/shared/FormAlert.svelte';
	import PasswordInput from '#lib/components/shared/PasswordInput.svelte';
	import PasswordStrength from '#lib/components/shared/PasswordStrength.svelte';
	import { Button } from '#lib/components/ui/button/index.js';
	import { Checkbox } from '#lib/components/ui/checkbox/index.js';
	import { Input } from '#lib/components/ui/input/index.js';
	import { Label } from '#lib/components/ui/label/index.js';
	import { destroyEngine, engine } from '#lib/crypto/index.js';
	import {
		validateRegistration,
		type RegistrationErrors
	} from '#lib/features/authentication/validation.js';
	import { errorMessage } from '#lib/utils/errors.js';

	let email = $state('');
	let accountPassword = $state('');
	let accountConfirm = $state('');
	let masterPassword = $state('');
	let masterConfirm = $state('');
	let acknowledged = $state(false);
	let errors = $state<RegistrationErrors>({});
	let error = $state<string | null>(null);
	let busy = $state(false);
	let done = $state<string | null>(null);

	async function submit(event: SubmitEvent) {
		event.preventDefault();
		error = null;
		errors = validateRegistration({
			email,
			accountPassword,
			accountConfirm,
			masterPassword,
			masterConfirm,
			acknowledged
		});
		if (Object.keys(errors).length) return;
		busy = true;
		try {
			// Runs Argon2id in the crypto worker: generates the vault key and wraps it locally.
			const { vaultId, envelope } = await engine.createVault(masterPassword);
			const res = await api.auth.register({
				email,
				password: accountPassword,
				vault_id: vaultId,
				key_envelope: envelope
			});
			done = res.message;
			accountPassword = accountConfirm = masterPassword = masterConfirm = '';
		} catch (err) {
			if (err instanceof ApiError) {
				errors = {
					email: err.fieldMessage('email'),
					accountPassword: err.fieldMessage('password')
				};
			}
			error = errorMessage(err);
		} finally {
			// The vault stays locked until the user verifies their email and signs in.
			await destroyEngine();
			busy = false;
		}
	}
</script>

{#if done}
	<AuthShell title="Check your email" description={done}>
		<p class="text-sm text-muted-foreground">
			Open the verification link we sent to <span class="font-medium text-foreground">
				{email}
			</span>, then sign in.
		</p>
		<Button href={resolve('login')} class="mt-4 w-full">Go to sign in</Button>
	</AuthShell>
{:else}
	<AuthShell
		title="Create your account"
		description="Two different passwords protect two different things."
	>
		<form class="space-y-5" onsubmit={submit} novalidate>
			{#if error}<FormAlert><p>{error}</p></FormAlert>{/if}

			<fieldset class="space-y-4">
				<legend class="mb-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">
					Account (sign-in)
				</legend>
				<Field id="email" label="Email" error={errors.email}>
					<Input
						id="email"
						type="email"
						autocomplete="email"
						required
						bind:value={email}
						aria-invalid={!!errors.email}
					/>
				</Field>
				<Field
					id="account-password"
					label="Account password"
					error={errors.accountPassword}
					hint="At least 12 characters. Can be reset by email."
				>
					<PasswordInput
						id="account-password"
						autocomplete="new-password"
						bind:value={accountPassword}
						aria-invalid={!!errors.accountPassword}
					/>
				</Field>
				<Field id="account-confirm" label="Confirm account password" error={errors.accountConfirm}>
					<PasswordInput
						id="account-confirm"
						autocomplete="new-password"
						bind:value={accountConfirm}
						aria-invalid={!!errors.accountConfirm}
					/>
				</Field>
			</fieldset>

			<fieldset class="space-y-4 border-t pt-5">
				<legend class="mb-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">
					Vault (encryption)
				</legend>
				<Field
					id="master-password"
					label="Master password"
					error={errors.masterPassword}
					hint="Never leaves this device. Use a long passphrase."
				>
					<PasswordInput
						id="master-password"
						autocomplete="off"
						bind:value={masterPassword}
						aria-invalid={!!errors.masterPassword}
					/>
				</Field>
				<PasswordStrength password={masterPassword} />
				<Field id="master-confirm" label="Confirm master password" error={errors.masterConfirm}>
					<PasswordInput
						id="master-confirm"
						autocomplete="off"
						bind:value={masterConfirm}
						aria-invalid={!!errors.masterConfirm}
					/>
				</Field>
				<div class="rounded-lg border border-warning/30 bg-warning-soft p-3 text-sm">
					<div class="flex gap-2">
						<TriangleAlertIcon class="mt-0.5 size-4 shrink-0 text-warning" />
						<p>
							CachePass cannot reset or recover your master password. If you lose it, the data in
							your vault is permanently unreadable — by you, the server operator, and anyone else.
						</p>
					</div>
					<div class="mt-3 flex items-start gap-2">
						<Checkbox id="ack" bind:checked={acknowledged} aria-invalid={!!errors.acknowledged} />
						<Label for="ack" class="leading-snug font-normal">
							I understand my master password cannot be recovered.
						</Label>
					</div>
					{#if errors.acknowledged}<p class="mt-1 text-xs text-destructive">
							{errors.acknowledged}
						</p>{/if}
				</div>
			</fieldset>

			<Button type="submit" class="w-full" disabled={busy}>
				{busy ? 'Creating encrypted vault…' : 'Create account'}
			</Button>
		</form>
		{#snippet footer()}
			Already have an account? <a
				href={resolve('login')}
				class="font-medium text-foreground underline-offset-2 hover:underline"
			>
				Sign in
			</a>
		{/snippet}
	</AuthShell>
{/if}
