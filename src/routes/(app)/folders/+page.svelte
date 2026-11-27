<script lang="ts">
	import { resolve } from '$app/paths';
	import FolderIcon from '@lucide/svelte/icons/folder';
	import PencilIcon from '@lucide/svelte/icons/pencil';
	import PlusIcon from '@lucide/svelte/icons/plus';
	import Trash2Icon from '@lucide/svelte/icons/trash-2';
	import { toast } from 'svelte-sonner';
	import ConfirmDialog from '#lib/components/shared/ConfirmDialog.svelte';
	import EmptyState from '#lib/components/shared/EmptyState.svelte';
	import { Button } from '#lib/components/ui/button/index.js';
	import * as Dialog from '#lib/components/ui/dialog/index.js';
	import { Input } from '#lib/components/ui/input/index.js';
	import { Label } from '#lib/components/ui/label/index.js';
	import { vault, type FolderEntry } from '#lib/stores/vault.svelte.js';
	import { errorMessage } from '#lib/utils/errors.js';

	const folders = $derived(
		[...vault.folders.values()].sort((a, b) => a.name.localeCompare(b.name))
	);
	const counts = $derived(
		vault.list.reduce<Record<string, number>>((acc, e) => {
			if (e.data.folderId && !e.deletedAt) acc[e.data.folderId] = (acc[e.data.folderId] ?? 0) + 1;
			return acc;
		}, {})
	);

	let dialogOpen = $state(false);
	let editing = $state<FolderEntry | null>(null);
	let name = $state('');
	let busy = $state(false);
	let deleting = $state<FolderEntry | null>(null);
	let confirmOpen = $state(false);

	function openDialog(folder: FolderEntry | null) {
		editing = folder;
		name = folder?.name ?? '';
		dialogOpen = true;
	}

	async function save(event: SubmitEvent) {
		event.preventDefault();
		if (!name.trim()) return;
		busy = true;
		try {
			if (editing) await vault.renameFolder(editing.id, name);
			else await vault.createFolder(name);
			toast.success(editing ? 'Folder renamed' : 'Folder created');
			dialogOpen = false;
		} catch (err) {
			toast.error(errorMessage(err));
		} finally {
			busy = false;
		}
	}

	async function remove() {
		if (!deleting) return;
		try {
			await vault.deleteFolder(deleting.id);
			toast.success('Folder deleted');
		} catch (err) {
			toast.error(errorMessage(err));
		}
	}
</script>

<svelte:head><title>Folders · CachePass</title></svelte:head>

<div class="mx-auto max-w-2xl space-y-6 p-4 sm:p-8">
	<div class="flex items-end justify-between gap-4">
		<div>
			<h1 class="text-xl font-semibold tracking-tight">Folders</h1>
			<p class="text-sm text-muted-foreground">
				Folder names are encrypted like everything else in your vault.
			</p>
		</div>
		<Button onclick={() => openDialog(null)}><PlusIcon /> New folder</Button>
	</div>

	{#if folders.length}
		<ul class="divide-y rounded-xl border bg-card">
			{#each folders as folder (folder.id)}
				<li class="flex items-center gap-3 px-4 py-3">
					<FolderIcon class="size-4 text-muted-foreground" />
					<a
						href={resolve(`folders/${folder.id}`)}
						class="min-w-0 flex-1 truncate text-sm font-medium hover:underline"
					>
						{folder.name}
					</a>
					<span class="text-xs text-muted-foreground tabular-nums">
						{counts[folder.id] ?? 0} items
					</span>
					<Button
						variant="ghost"
						size="icon-sm"
						aria-label={`Rename ${folder.name}`}
						onclick={() => openDialog(folder)}
					>
						<PencilIcon />
					</Button>
					<Button
						variant="ghost"
						size="icon-sm"
						aria-label={`Delete ${folder.name}`}
						onclick={() => {
							deleting = folder;
							confirmOpen = true;
						}}
					>
						<Trash2Icon />
					</Button>
				</li>
			{/each}
		</ul>
	{:else}
		<div class="rounded-xl border border-dashed">
			<EmptyState
				icon={FolderIcon}
				title="No folders yet"
				description="Group related items, like Work or Finance."
			/>
		</div>
	{/if}
</div>

<Dialog.Root bind:open={dialogOpen}>
	<Dialog.Content class="sm:max-w-sm">
		<Dialog.Header>
			<Dialog.Title>{editing ? 'Rename folder' : 'New folder'}</Dialog.Title>
		</Dialog.Header>
		<form class="space-y-4" onsubmit={save}>
			<div class="space-y-1.5">
				<Label for="folder-name">Name</Label>
				<Input id="folder-name" bind:value={name} maxlength={100} required autocomplete="off" />
			</div>
			<Dialog.Footer>
				<Button type="button" variant="ghost" onclick={() => (dialogOpen = false)}>Cancel</Button>
				<Button type="submit" disabled={busy || !name.trim()}>Save</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>

<ConfirmDialog
	bind:open={confirmOpen}
	title="Delete folder?"
	description={`"${deleting?.name ?? ''}" will be deleted. Its items are kept and moved to "No folder".`}
	confirmLabel="Delete folder"
	destructive
	onconfirm={remove}
/>
