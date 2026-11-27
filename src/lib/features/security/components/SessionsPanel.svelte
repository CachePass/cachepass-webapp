<script lang="ts">
	import LaptopIcon from '@lucide/svelte/icons/laptop';
	import { toast } from 'svelte-sonner';
	import { api, type DeviceInfo, type SessionInfo } from '#lib/api/index.js';
	import ConfirmDialog from '#lib/components/shared/ConfirmDialog.svelte';
	import { Badge } from '#lib/components/ui/badge/index.js';
	import { Button } from '#lib/components/ui/button/index.js';
	import { Skeleton } from '#lib/components/ui/skeleton/index.js';
	import { handleSessionExpired } from '#lib/features/vault/actions.js';
	import { errorMessage, relativeTime } from '#lib/utils/errors.js';
	import Panel from './Panel.svelte';

	let { version = 0 }: { version?: number } = $props();
	let sessions = $state<SessionInfo[] | null>(null);
	let devices = $state<DeviceInfo[] | null>(null);
	let error = $state<string | null>(null);
	let confirmAll = $state(false);

	async function reload() {
		try {
			[sessions, devices] = await Promise.all([api.sessions.list(), api.devices.list()]);
			error = null;
		} catch (err) {
			error = errorMessage(err);
		}
	}

	// Reload on mount and whenever the parent bumps `version` (e.g. after a password change).
	$effect(() => {
		void version;
		void reload();
	});

	async function revokeSession(s: SessionInfo) {
		try {
			await api.sessions.revoke(s.id);
			if (s.current) return void handleSessionExpired();
			toast.success('Session signed out');
			await reload();
		} catch (err) {
			toast.error(errorMessage(err));
		}
	}

	async function removeDevice(d: DeviceInfo) {
		try {
			await api.devices.remove(d.id);
			if (d.current) return void handleSessionExpired();
			toast.success('Device removed and signed out');
			await reload();
		} catch (err) {
			toast.error(errorMessage(err));
		}
	}

	async function logoutAll() {
		await api.auth.logoutAll();
		await handleSessionExpired();
	}
</script>

{#snippet loading()}
	<div class="space-y-2"><Skeleton class="h-10 w-full" /><Skeleton class="h-10 w-full" /></div>
{/snippet}

<Panel
	id="sessions"
	title="Active sessions"
	description="Every browser currently signed in to your account."
>
	{#snippet actions()}
		<Button variant="outline" size="sm" onclick={() => (confirmAll = true)}>
			Sign out everywhere
		</Button>
	{/snippet}
	{#if error}<p class="text-sm text-destructive">
			{error}
		</p>{:else if !sessions}{@render loading()}{:else}
		<ul class="divide-y">
			{#each sessions as s (s.id)}
				<li class="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
					<LaptopIcon class="size-4 shrink-0 text-muted-foreground" />
					<div class="min-w-0 flex-1 text-sm">
						<p class="flex items-center gap-2 font-medium">
							{s.device_name ?? 'Unknown device'}
							{#if s.current}<Badge variant="secondary">This session</Badge>{/if}
						</p>
						<p class="truncate text-xs text-muted-foreground">
							{s.ip ?? 'unknown IP'} · active {relativeTime(s.last_seen_at)} · signed in {relativeTime(
								s.created_at
							)}
						</p>
					</div>
					<Button variant="ghost" size="sm" onclick={() => revokeSession(s)}>Sign out</Button>
				</li>
			{/each}
		</ul>
	{/if}
</Panel>

<Panel
	id="devices"
	title="Devices"
	description="Browsers recognised by a device cookie. Removing a device signs out all of its sessions."
>
	{#if error}<p class="text-sm text-destructive">
			{error}
		</p>{:else if !devices}{@render loading()}{:else}
		<ul class="divide-y">
			{#each devices as d (d.id)}
				<li class="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
					<LaptopIcon class="size-4 shrink-0 text-muted-foreground" />
					<div class="min-w-0 flex-1 text-sm">
						<p class="flex items-center gap-2 font-medium">
							{d.name}
							{#if d.current}<Badge variant="secondary">This device</Badge>{/if}
						</p>
						<p class="truncate text-xs text-muted-foreground">
							{d.active_sessions} active session(s) · last seen {relativeTime(
								d.last_seen_at
							)}{d.last_ip ? ` from ${d.last_ip}` : ''}
						</p>
					</div>
					<Button variant="ghost" size="sm" onclick={() => removeDevice(d)}>Remove</Button>
				</li>
			{/each}
		</ul>
	{/if}
</Panel>

<ConfirmDialog
	bind:open={confirmAll}
	title="Sign out everywhere?"
	description="All sessions, including this one, will be signed out. You will need your account password to sign in again."
	confirmLabel="Sign out everywhere"
	destructive
	onconfirm={logoutAll}
/>
