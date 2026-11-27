<script lang="ts">
	import { resolve } from '$app/paths';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { api } from '#lib/api/index.js';
	import AuthShell from '#lib/components/auth/AuthShell.svelte';
	import Field from '#lib/components/shared/Field.svelte';
	import FormAlert from '#lib/components/shared/FormAlert.svelte';
	import PasswordInput from '#lib/components/shared/PasswordInput.svelte';
	import { Button } from '#lib/components/ui/button/index.js';
	import { Input } from '#lib/components/ui/input/index.js';
	import { session } from '#lib/stores/session.svelte.js';
	import { errorMessage } from '#lib/utils/errors.js';

	let step = $state<'credentials' | 'mfa'>('credentials');
	let email = $state('');
	let password = $state('');
	let code = $state('');
	let error = $state<string | null>(null);
	let unverified = $state(false);
	let busy = $state(false);
	const expired = page.url.searchParams.get('expired') === '1';

	async function submitCredentials(event: SubmitEvent) {
		event.preventDefault();
		busy = true;
		error = null;
		unverified = false;
		try {
			const res = await api.auth.login(email, password);
			password = '';
			if (res.status === 'mfa_required') {
				step = 'mfa';
			} else if (res.account) {
				session.set(res.account);
				await goto(resolve('unlock'));
			}
		} catch (err) {
			unverified = err instanceof Error && 'code' in err && err.code === 'email_not_verified';
			error = errorMessage(err);
		} finally {
			busy = false;
		}
	}

	async function submitCode(event: SubmitEvent) {
		event.preventDefault();
		busy = true;
		error = null;
		try {
			const res = await api.auth.loginMfa(code);
			if (res.account) {
				session.set(res.account);
				await goto(resolve('unlock'));
			}
		} catch (err) {
			code = '';
			error = errorMessage(err);
			if (
				err instanceof Error &&
				'status' in err &&
				err.status === 401 &&
				'code' in err &&
				err.code === 'unauthorized'
			) {
				step = 'credentials';
				error = 'The sign-in attempt expired. Please sign in again.';
			}
		} finally {
			busy = false;
		}
	}

	async function resend() {
		await api.auth.resendVerification(email).catch(() => undefined);
		error = null;
		unverified = false;
		step = 'credentials';
	}
</script>

{#if step === 'credentials'}
	<AuthShell
		title="Sign in"
		description="Use your account password. Your vault is unlocked separately with your master password."
	>
		<form class="space-y-4" onsubmit={submitCredentials}>
			{#if expired && !error}
				<FormAlert variant="info">
					<p>Your session ended and the vault was locked. Sign in again.</p>
				</FormAlert>
			{/if}
			{#if error}
				<FormAlert>
					<p>{error}</p>
					{#if unverified}
						<button type="button" class="underline underline-offset-2" onclick={resend}>
							Resend verification email
						</button>
					{/if}
				</FormAlert>
			{/if}
			<Field id="email" label="Email">
				<Input id="email" type="email" autocomplete="username" required bind:value={email} />
			</Field>
			<Field id="password" label="Account password">
				<PasswordInput
					id="password"
					autocomplete="current-password"
					required
					bind:value={password}
				/>
			</Field>
			<div class="flex items-center justify-between gap-2">
				<a
					href={resolve('forgot-password')}
					class="text-sm text-muted-foreground underline-offset-2 hover:underline"
				>
					Forgot password?
				</a>
				<Button type="submit" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</Button>
			</div>
		</form>
		{#snippet footer()}
			New to CachePass? <a
				href={resolve('register')}
				class="font-medium text-foreground underline-offset-2 hover:underline"
			>
				Create an account
			</a>
		{/snippet}
	</AuthShell>
{:else}
	<AuthShell
		title="Two-factor authentication"
		description="Enter the 6-digit code from your authenticator app, or a recovery code."
	>
		<form class="space-y-4" onsubmit={submitCode}>
			{#if error}<FormAlert><p>{error}</p></FormAlert>{/if}
			<Field id="code" label="Authentication code">
				<Input
					id="code"
					inputmode="text"
					autocomplete="one-time-code"
					class="font-secret tracking-widest"
					required
					maxlength={24}
					bind:value={code}
				/>
			</Field>
			<div class="flex items-center justify-between">
				<button
					type="button"
					class="text-sm text-muted-foreground hover:underline"
					onclick={() => (step = 'credentials')}
				>
					Back
				</button>
				<Button type="submit" disabled={busy || !code}>{busy ? 'Verifying…' : 'Verify'}</Button>
			</div>
		</form>
	</AuthShell>
{/if}
