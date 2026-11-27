<script lang="ts">
	import FolderIcon from '@lucide/svelte/icons/folder';
	import { page } from '$app/state';
	import EmptyState from '#lib/components/shared/EmptyState.svelte';
	import VaultBrowser from '#lib/components/vault/VaultBrowser.svelte';
	import { vault } from '#lib/stores/vault.svelte.js';

	const folder = $derived(vault.folders.get(page.params.id ?? ''));
</script>

{#if folder}
	{#key folder.id}
		<VaultBrowser
			title={folder.name}
			filter={{ folderId: folder.id }}
			emptyIcon={FolderIcon}
			emptyTitle="This folder is empty"
			emptyDescription="Assign items to this folder from the item editor."
		/>
	{/key}
{:else}
	<EmptyState
		icon={FolderIcon}
		title="Folder not found"
		description="It may have been deleted on another device."
	/>
{/if}
