<script lang="ts">
	import ArrowDownUpIcon from '@lucide/svelte/icons/arrow-down-up';
	import LockKeyholeIcon from '@lucide/svelte/icons/lock-keyhole';
	import PlusIcon from '@lucide/svelte/icons/plus';
	import RefreshCwIcon from '@lucide/svelte/icons/refresh-cw';
	import SearchIcon from '@lucide/svelte/icons/search';
	import StarIcon from '@lucide/svelte/icons/star';
	import TriangleAlertIcon from '@lucide/svelte/icons/triangle-alert';
	import type { Component } from 'svelte';
	import { toast } from 'svelte-sonner';
	import EmptyState from '#lib/components/shared/EmptyState.svelte';
	import Kbd from '#lib/components/shared/Kbd.svelte';
	import { Button } from '#lib/components/ui/button/index.js';
	import * as DropdownMenu from '#lib/components/ui/dropdown-menu/index.js';
	import { Input } from '#lib/components/ui/input/index.js';
	import { TYPE_ICONS } from '#lib/features/vault/navigation.js';
	import {
		filterItems,
		itemSubtitle,
		sortItems,
		type ItemFilter,
		type SortKey
	} from '#lib/features/vault/search.js';
	import { ITEM_TYPES, ITEM_TYPE_LABELS, type ItemType } from '#lib/schemas/item.js';
	import { settings } from '#lib/stores/settings.svelte.js';
	import { ui } from '#lib/stores/ui.svelte.js';
	import { vault } from '#lib/stores/vault.svelte.js';
	import { cn } from '#lib/utils.js';
	import { errorMessage } from '#lib/utils/errors.js';
	import ItemDetail from './ItemDetail.svelte';
	import ItemIcon from './ItemIcon.svelte';

	interface Props {
		title: string;
		filter: ItemFilter;
		emptyIcon: Component<{ class?: string }>;
		emptyTitle: string;
		emptyDescription: string;
		createType?: ItemType;
		allowCreate?: boolean;
	}
	let {
		title,
		filter,
		emptyIcon,
		emptyTitle,
		emptyDescription,
		createType = 'login',
		allowCreate = true
	}: Props = $props();

	let query = $state('');
	let searchInput = $state<HTMLInputElement | null>(null);
	let listEl = $state<HTMLElement | null>(null);

	const visible = $derived(
		sortItems(filterItems(vault.list, { ...filter, query }), settings.value.sort)
	);
	const selected = $derived(ui.selectedId ? vault.entries.get(ui.selectedId) : undefined);
	const SORT_LABELS: Record<SortKey, string> = {
		name: 'Name',
		updated: 'Last modified',
		created: 'Date created'
	};

	$effect(() => {
		if (ui.focusSearch > 0) searchInput?.focus();
	});

	function select(id: string) {
		ui.selectedId = id;
	}

	function onListKeydown(event: KeyboardEvent) {
		if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key) || visible.length === 0)
			return;
		event.preventDefault();
		const index = visible.findIndex((e) => e.id === ui.selectedId);
		const next =
			event.key === 'Home'
				? 0
				: event.key === 'End'
					? visible.length - 1
					: event.key === 'ArrowDown'
						? Math.min(visible.length - 1, index + 1)
						: Math.max(0, index - 1);
		select(visible[next].id);
		listEl?.querySelector<HTMLElement>(`[data-id="${visible[next].id}"]`)?.focus();
	}

	async function refresh() {
		try {
			await vault.sync();
		} catch (err) {
			toast.error(errorMessage(err));
		}
	}
</script>

<svelte:head><title>{title} · CachePass</title></svelte:head>

<div class="flex h-full">
	<section
		class={cn(
			'flex w-full min-w-0 flex-col border-r lg:w-[380px] lg:shrink-0',
			selected && 'hidden lg:flex'
		)}
		aria-label={title}
	>
		<div class="space-y-3 border-b p-3">
			<div class="flex items-center gap-2">
				<h1 class="flex-1 truncate text-base font-semibold">
					{title}
					<span class="ml-1 text-sm font-normal text-muted-foreground tabular-nums">
						{visible.length}
					</span>
				</h1>
				<Button
					variant="ghost"
					size="icon-sm"
					aria-label="Sync now"
					onclick={refresh}
					disabled={vault.syncing}
				>
					<RefreshCwIcon class={cn(vault.syncing && 'animate-spin')} />
				</Button>
				{#if allowCreate}
					<DropdownMenu.Root>
						<DropdownMenu.Trigger>
							{#snippet child({ props })}
								<Button {...props} size="sm"><PlusIcon /> New</Button>
							{/snippet}
						</DropdownMenu.Trigger>
						<DropdownMenu.Content align="end" class="w-48">
							{#each ITEM_TYPES as type (type)}
								{@const Icon = TYPE_ICONS[type]}
								<DropdownMenu.Item onclick={() => ui.createItem(type, filter.folderId ?? null)}>
									<Icon />
									{ITEM_TYPE_LABELS[type].singular}
									{#if type === createType}<DropdownMenu.Shortcut>N</DropdownMenu.Shortcut>{/if}
								</DropdownMenu.Item>
							{/each}
						</DropdownMenu.Content>
					</DropdownMenu.Root>
				{/if}
			</div>
			<div class="flex gap-2">
				<div class="relative flex-1">
					<SearchIcon
						class="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
					/>
					<Input
						bind:ref={searchInput}
						bind:value={query}
						type="search"
						placeholder="Search"
						aria-label="Search items"
						class="pr-8 pl-8"
					/>
					{#if !query}<span class="absolute top-1/2 right-2 -translate-y-1/2">
							<Kbd>/</Kbd>
						</span>{/if}
				</div>
				<DropdownMenu.Root>
					<DropdownMenu.Trigger>
						{#snippet child({ props })}
							<Button
								{...props}
								variant="outline"
								size="icon"
								aria-label={`Sort by ${SORT_LABELS[settings.value.sort].toLowerCase()}`}
							>
								<ArrowDownUpIcon />
							</Button>
						{/snippet}
					</DropdownMenu.Trigger>
					<DropdownMenu.Content align="end">
						<DropdownMenu.Label>Sort by</DropdownMenu.Label>
						<DropdownMenu.RadioGroup
							value={settings.value.sort}
							onValueChange={(v) => settings.update({ sort: v as SortKey })}
						>
							{#each Object.entries(SORT_LABELS) as [key, label] (key)}
								<DropdownMenu.RadioItem value={key}>{label}</DropdownMenu.RadioItem>
							{/each}
						</DropdownMenu.RadioGroup>
					</DropdownMenu.Content>
				</DropdownMenu.Root>
			</div>
		</div>

		{#if vault.undecryptable.length && !filter.trash}
			<div class="flex gap-2 border-b bg-warning-soft px-3 py-2 text-xs">
				<TriangleAlertIcon class="size-4 shrink-0 text-warning" />
				<p>
					{vault.undecryptable.length} item(s) could not be decrypted or verified and are hidden. They
					may be corrupted or were modified outside CachePass.
				</p>
			</div>
		{/if}

		<ul
			bind:this={listEl}
			class="flex-1 scrollbar-thin overflow-y-auto p-1.5"
			role="listbox"
			aria-label="Items"
			tabindex="-1"
			onkeydown={onListKeydown}
		>
			{#each visible as entry (entry.id)}
				<li role="none">
					<button
						type="button"
						role="option"
						aria-selected={entry.id === ui.selectedId}
						data-id={entry.id}
						tabindex={entry.id === ui.selectedId || (!ui.selectedId && entry === visible[0])
							? 0
							: -1}
						onclick={() => select(entry.id)}
						class={cn(
							'flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring',
							entry.id === ui.selectedId && 'bg-accent'
						)}
					>
						<ItemIcon type={entry.data.type} name={entry.data.name} />
						<span class="min-w-0 flex-1">
							<span class="flex items-center gap-1.5">
								<span class="truncate text-sm font-medium">{entry.data.name}</span>
								{#if entry.data.favorite}<StarIcon
										class="size-3 shrink-0 fill-current text-warning"
										aria-label="Favorite"
									/>{/if}
							</span>
							<span class="block truncate text-xs text-muted-foreground">
								{itemSubtitle(entry.data)}
							</span>
						</span>
					</button>
				</li>
			{:else}
				<li class="h-full">
					{#if query}
						<EmptyState
							icon={SearchIcon}
							title="No matches"
							description={`Nothing in ${title.toLowerCase()} matches “${query}”. Search runs locally on decrypted data.`}
						/>
					{:else}
						<EmptyState icon={emptyIcon} title={emptyTitle} description={emptyDescription}>
							{#if allowCreate}
								<Button
									size="sm"
									variant="outline"
									onclick={() => ui.createItem(createType, filter.folderId ?? null)}
								>
									<PlusIcon /> New {ITEM_TYPE_LABELS[createType].singular.toLowerCase()}
								</Button>
							{/if}
						</EmptyState>
					{/if}
				</li>
			{/each}
		</ul>
	</section>

	<section class={cn('min-w-0 flex-1', !selected && 'hidden lg:block')} aria-label="Item details">
		{#if selected}
			{#key selected.id}
				<ItemDetail entry={selected} onback={() => (ui.selectedId = null)} />
			{/key}
		{:else}
			<EmptyState
				icon={LockKeyholeIcon}
				title="Select an item"
				description="Items are decrypted locally in your browser. Press ⌘K to search everything."
			/>
		{/if}
	</section>
</div>
