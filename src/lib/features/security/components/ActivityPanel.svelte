<script lang="ts">
	import { onMount } from 'svelte';
	import { api, type AuditPage } from '#lib/api/index.js';
	import { Button } from '#lib/components/ui/button/index.js';
	import { Skeleton } from '#lib/components/ui/skeleton/index.js';
	import { errorMessage, relativeTime } from '#lib/utils/errors.js';
	import Panel from './Panel.svelte';

	const LABELS: Record<string, string> = {
		account_created: 'Account created',
		email_verified: 'Email verified',
		login_succeeded: 'Signed in',
		login_failed: 'Failed sign-in attempt',
		login_mfa_challenged: 'Password accepted, 2FA requested',
		login_mfa_failed: 'Wrong 2FA code',
		mfa_recovery_code_used: 'Recovery code used',
		logout: 'Signed out',
		logout_all: 'Signed out everywhere',
		password_changed: 'Account password changed',
		password_reset_requested: 'Password reset requested',
		password_reset: 'Account password reset',
		mfa_enabled: '2FA enabled',
		mfa_disabled: '2FA disabled',
		mfa_recovery_codes_regenerated: 'Recovery codes regenerated',
		session_revoked: 'Session revoked',
		device_removed: 'Device removed',
		key_envelope_updated: 'Master password changed',
		account_updated: 'Profile updated'
	};

	let entries = $state<AuditPage['entries']>([]);
	let next = $state<string | null>(null);
	let loaded = $state(false);
	let error = $state<string | null>(null);

	async function load(before?: string) {
		try {
			const page = await api.audit.list(before);
			entries = before ? [...entries, ...page.entries] : page.entries;
			next = page.next_before;
		} catch (err) {
			error = errorMessage(err);
		} finally {
			loaded = true;
		}
	}
	onMount(() => load());
</script>

<Panel
	id="activity"
	title="Recent activity"
	description="Security events recorded for your account."
>
	{#if error}<p class="text-sm text-destructive">{error}</p>{:else if !loaded}
		<div class="space-y-2"><Skeleton class="h-5 w-full" /><Skeleton class="h-5 w-4/5" /></div>
	{:else}
		<ul class="space-y-2 text-sm">
			{#each entries as e (e.id)}
				<li class="flex items-baseline justify-between gap-4">
					<span class={e.event.includes('failed') ? 'text-destructive' : ''}>
						{LABELS[e.event] ?? e.event}
					</span>
					<span
						class="shrink-0 text-xs text-muted-foreground"
						title={new Date(e.created_at).toLocaleString()}
					>
						{e.ip ?? ''} · {relativeTime(e.created_at)}
					</span>
				</li>
			{/each}
		</ul>
		{#if next}<Button
				variant="ghost"
				size="sm"
				class="mt-3"
				onclick={() => load(next ?? undefined)}
			>
				Load more
			</Button>{/if}
	{/if}
</Panel>
