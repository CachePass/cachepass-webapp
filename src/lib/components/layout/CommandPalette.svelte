<script lang="ts">
	import { resolve } from '$app/paths';
	import LockIcon from '@lucide/svelte/icons/lock';
	import MoonIcon from '@lucide/svelte/icons/moon';
	import PlusIcon from '@lucide/svelte/icons/plus';
	import SettingsIcon from '@lucide/svelte/icons/settings';
	import ShieldCheckIcon from '@lucide/svelte/icons/shield-check';
	import WandIcon from '@lucide/svelte/icons/wand-sparkles';
	import { toggleMode } from 'mode-watcher';
	import { goto } from '$app/navigation';
	import * as Command from '#lib/components/ui/command/index.js';
	import { lockVault } from '#lib/features/vault/actions.js';
	import { TYPE_ICONS } from '#lib/features/vault/navigation.js';
	import { itemSubtitle } from '#lib/features/vault/search.js';
	import { ITEM_TYPES, ITEM_TYPE_LABELS } from '#lib/schemas/item.js';
	import { ui } from '#lib/stores/ui.svelte.js';
	import { vault } from '#lib/stores/vault.svelte.js';

	const items = $derived(
		vault.list
			.filter((e) => e.deletedAt === null)
			.sort((a, b) => a.data.name.localeCompare(b.data.name))
			.slice(0, 200)
	);

	function run(fn: () => unknown) {
		ui.commandOpen = false;
		void fn();
	}

	async function openItem(id: string) {
		await goto(resolve('vault'));
		ui.selectedId = id;
	}
</script>

<Command.Dialog
	bind:open={ui.commandOpen}
	title="Command palette"
	description="Search items and run commands"
>
	<Command.Input placeholder="Search items or type a command…" />
	<Command.List class="scrollbar-thin">
		<Command.Empty>No results.</Command.Empty>
		{#if items.length}
			<Command.Group heading="Items">
				{#each items as entry (entry.id)}
					{@const Icon = TYPE_ICONS[entry.data.type]}
					<Command.Item
						value={`item ${entry.data.name} ${itemSubtitle(entry.data)} ${entry.id}`}
						onSelect={() => run(() => openItem(entry.id))}
					>
						<Icon class="text-muted-foreground" />
						<span class="truncate">{entry.data.name}</span>
						<span class="ml-auto truncate text-xs text-muted-foreground">
							{itemSubtitle(entry.data)}
						</span>
					</Command.Item>
				{/each}
			</Command.Group>
		{/if}
		<Command.Group heading="Create">
			{#each ITEM_TYPES as type (type)}
				<Command.Item
					value={`new ${ITEM_TYPE_LABELS[type].singular}`}
					onSelect={() => run(() => ui.createItem(type))}
				>
					<PlusIcon class="text-muted-foreground" /> New {ITEM_TYPE_LABELS[
						type
					].singular.toLowerCase()}
				</Command.Item>
			{/each}
		</Command.Group>
		<Command.Group heading="Go to">
			<Command.Item
				value="generator password"
				onSelect={() => run(() => goto(resolve('generator')))}
			>
				<WandIcon /> Password generator
			</Command.Item>
			<Command.Item
				value="security sessions devices mfa"
				onSelect={() => run(() => goto(resolve('security')))}
			>
				<ShieldCheckIcon /> Security
			</Command.Item>
			<Command.Item
				value="settings preferences"
				onSelect={() => run(() => goto(resolve('settings')))}
			>
				<SettingsIcon /> Settings
			</Command.Item>
		</Command.Group>
		<Command.Group heading="Actions">
			<Command.Item value="toggle theme dark light" onSelect={() => run(toggleMode)}>
				<MoonIcon /> Toggle theme
			</Command.Item>
			<Command.Item value="lock vault" onSelect={() => run(lockVault)}>
				<LockIcon /> Lock vault <Command.Shortcut>⇧⌘L</Command.Shortcut>
			</Command.Item>
		</Command.Group>
	</Command.List>
</Command.Dialog>
