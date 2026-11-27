<script lang="ts">
	import { resolve } from '$app/paths';
	import { onMount } from 'svelte';
	import CircleCheckIcon from '@lucide/svelte/icons/circle-check';
	import { api } from '#lib/api/index.js';
	import AuthShell from '#lib/components/auth/AuthShell.svelte';
	import Field from '#lib/components/shared/Field.svelte';
	import FormAlert from '#lib/components/shared/FormAlert.svelte';
	import { Button } from '#lib/components/ui/button/index.js';
	import { Input } from '#lib/components/ui/input/index.js';
	import { Skeleton } from '#lib/components/ui/skeleton/index.js';
	import { errorMessage } from '#lib/utils/errors.js';
	import { takeFragmentToken } from '#lib/utils/fragment.js';

	let status = $state<'verifying' | 'verified' | 'failed' | 'missing'>('verifying');
	let message = $state('');
	let email = $state('');
	let resent = $state(false);

	onMount(async () => {
		const token = takeFragmentToken();
		if (!token) {
			status = 'missing';
			return;
		}
		try {
			message = (await api.auth.verifyEmail(token)).message;
			status = 'verified';
		} catch (err) {
			message = errorMessage(err);
			status = 'failed';
		}
	});

	async function resend(event: SubmitEvent) {
		event.preventDefault();
		await api.auth.resendVerification(email).catch(() => undefined);
		resent = true;
	}
</script>

<AuthShell title="Email verification">
	{#if status === 'verifying'}
		<div class="space-y-2" aria-busy="true" aria-label="Verifying">
			<Skeleton class="h-4 w-3/4" />
			<Skeleton class="h-4 w-1/2" />
		</div>
	{:else if status === 'verified'}
		<div class="flex gap-3">
			<CircleCheckIcon class="size-5 shrink-0 text-brand" />
			<p class="text-sm">{message}</p>
		</div>
		<Button href={resolve('login')} class="mt-4 w-full">Sign in</Button>
	{:else}
		<div class="space-y-4">
			<FormAlert>
				<p>{status === 'missing' ? 'This verification link is incomplete.' : message}</p>
			</FormAlert>
			{#if resent}
				<FormAlert variant="info">
					<p>If the account needs verification, a new link is on its way.</p>
				</FormAlert>
			{:else}
				<form class="space-y-3" onsubmit={resend}>
					<Field id="email" label="Send a new link to">
						<Input id="email" type="email" required bind:value={email} autocomplete="email" />
					</Field>
					<Button type="submit" variant="outline" class="w-full">Resend verification email</Button>
				</form>
			{/if}
		</div>
	{/if}
</AuthShell>
