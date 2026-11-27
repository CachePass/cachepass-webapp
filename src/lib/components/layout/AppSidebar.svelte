<script lang="ts">
	import type { ResolvedPathname } from '$app/types';
	import { resolve } from '$app/paths';
	import FolderIcon from '@lucide/svelte/icons/folder';
	import FolderCogIcon from '@lucide/svelte/icons/folder-cog';
	import LockIcon from '@lucide/svelte/icons/lock';
	import LogOutIcon from '@lucide/svelte/icons/log-out';
	import SettingsIcon from '@lucide/svelte/icons/settings';
	import ShieldCheckIcon from '@lucide/svelte/icons/shield-check';
	import Trash2Icon from '@lucide/svelte/icons/trash-2';
	import WandIcon from '@lucide/svelte/icons/wand-sparkles';
	import ChevronsUpDownIcon from '@lucide/svelte/icons/chevrons-up-down';
	import type { Component } from 'svelte';
	import { page } from '$app/state';
	import Logo from '#lib/components/shared/Logo.svelte';
	import Kbd from '#lib/components/shared/Kbd.svelte';
	import * as DropdownMenu from '#lib/components/ui/dropdown-menu/index.js';
	import { lockVault, signOut } from '#lib/features/vault/actions.js';
	import { VAULT_NAV } from '#lib/features/vault/navigation.js';
	import { session } from '#lib/stores/session.svelte.js';
	import { ui } from '#lib/stores/ui.svelte.js';
	import { vault } from '#lib/stores/vault.svelte.js';
	import { cn } from '#lib/utils.js';

	let { onnavigate }: { onnavigate?: () => void } = $props();

	const active = $derived(vault.list.filter((e) => e.deletedAt === null));
	const counts = $derived({
		all: active.length,
		favorites: active.filter((e) => e.data.favorite).length,
		trash: vault.list.length - active.length,
		byType: active.reduce<Record<string, number>>(
			(acc, e) => ((acc[e.data.type] = (acc[e.data.type] ?? 0) + 1), acc),
			{}
		),
		byFolder: active.reduce<Record<string, number>>((acc, e) => {
			if (e.data.folderId) acc[e.data.folderId] = (acc[e.data.folderId] ?? 0) + 1;
			return acc;
		}, {})
	});
	const folders = $derived(
		[...vault.folders.values()].sort((a, b) => a.name.localeCompare(b.name))
	);

	function isActive(href: ResolvedPathname): boolean {
		const [path, query] = href.split('?');
		if (page.url.pathname !== path) return false;
		const type = new URLSearchParams(query ?? '').get('type');
		return (page.url.searchParams.get('type') ?? null) === type;
	}
</script>

{#snippet link(
	href: ResolvedPathname,
	label: string,
	Icon: Component<{ class?: string }>,
	count?: number
)}
	<a
		{href}
		onclick={onnavigate}
		aria-current={isActive(href) ? 'page' : undefined}
		class={cn(
			'group flex h-8 items-center gap-2.5 rounded-md px-2 text-sm text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground',
			isActive(href) && 'bg-sidebar-accent font-medium text-sidebar-foreground'
		)}
	>
		<Icon class={cn('size-4 shrink-0 text-muted-foreground', isActive(href) && 'text-brand')} />
		<span class="truncate">{label}</span>
		{#if count !== undefined && count > 0}
			<span class="ml-auto text-xs text-muted-foreground tabular-nums">{count}</span>
		{/if}
	</a>
{/snippet}

<nav aria-label="Main" class="flex h-full flex-col gap-4 bg-sidebar px-3 py-3">
	<div class="flex items-center justify-between px-1">
		<a href={resolve('vault')} onclick={onnavigate} class="rounded-md"><Logo /></a>
	</div>

	<button
		type="button"
		onclick={() => (ui.commandOpen = true)}
		class="flex h-8 items-center gap-2 rounded-md border bg-background px-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
	>
		<span class="flex-1 text-left">Search or jump to…</span>
		<Kbd>⌘K</Kbd>
	</button>

	<div class="-mx-1 flex-1 scrollbar-thin space-y-5 overflow-y-auto px-1">
		<div class="space-y-0.5">
			{#each VAULT_NAV as item (item.href)}
				{@render link(
					item.href,
					item.label,
					item.icon,
					item.favorites
						? counts.favorites
						: item.type
							? (counts.byType[item.type] ?? 0)
							: counts.all
				)}
			{/each}
		</div>

		<div class="space-y-0.5">
			<div class="flex items-center justify-between px-2 pb-1">
				<span class="text-xs font-medium text-muted-foreground">Folders</span>
				<a
					href={resolve('folders')}
					onclick={onnavigate}
					class="rounded text-muted-foreground hover:text-foreground"
					aria-label="Manage folders"
				>
					<FolderCogIcon class="size-3.5" />
				</a>
			</div>
			{#each folders as folder (folder.id)}
				{@render link(
					resolve(`folders/${folder.id}`),
					folder.name,
					FolderIcon,
					counts.byFolder[folder.id]
				)}
			{:else}
				<a
					href={resolve('folders')}
					onclick={onnavigate}
					class="block px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
				>
					Create a folder
				</a>
			{/each}
		</div>

		<div class="space-y-0.5">
			{@render link(resolve('trash'), 'Trash', Trash2Icon, counts.trash)}
			{@render link(resolve('generator'), 'Password generator', WandIcon)}
			{@render link(resolve('security'), 'Security', ShieldCheckIcon)}
			{@render link(resolve('settings'), 'Settings', SettingsIcon)}
		</div>
	</div>

	<DropdownMenu.Root>
		<DropdownMenu.Trigger
			class="flex w-full items-center gap-2.5 rounded-md p-1.5 text-left transition-colors hover:bg-sidebar-accent"
		>
			<span
				class="flex size-7 items-center justify-center rounded-md bg-brand-soft text-xs font-semibold text-brand uppercase"
			>
				{(session.account?.name || session.account?.email || '?').slice(0, 1)}
			</span>
			<span class="min-w-0 flex-1">
				<span class="block truncate text-sm font-medium">{session.account?.name || 'Account'}</span>
				<span class="block truncate text-xs text-muted-foreground">{session.account?.email}</span>
			</span>
			<ChevronsUpDownIcon class="size-4 text-muted-foreground" />
		</DropdownMenu.Trigger>
		<DropdownMenu.Content side="top" align="start" class="w-56">
			<DropdownMenu.Item onclick={lockVault}>
				<LockIcon /> Lock vault <DropdownMenu.Shortcut>⇧⌘L</DropdownMenu.Shortcut>
			</DropdownMenu.Item>
			<DropdownMenu.Separator />
			<DropdownMenu.Item onclick={signOut}><LogOutIcon /> Sign out</DropdownMenu.Item>
		</DropdownMenu.Content>
	</DropdownMenu.Root>
</nav>
