<script lang="ts">
	import ArchiveRestoreIcon from '@lucide/svelte/icons/archive-restore';
	import ArrowLeftIcon from '@lucide/svelte/icons/arrow-left';
	import CopyPlusIcon from '@lucide/svelte/icons/copy-plus';
	import EllipsisIcon from '@lucide/svelte/icons/ellipsis';
	import FolderIcon from '@lucide/svelte/icons/folder';
	import PencilIcon from '@lucide/svelte/icons/pencil';
	import StarIcon from '@lucide/svelte/icons/star';
	import Trash2Icon from '@lucide/svelte/icons/trash-2';
	import { toast } from 'svelte-sonner';
	import ConfirmDialog from '#lib/components/shared/ConfirmDialog.svelte';
	import { Badge } from '#lib/components/ui/badge/index.js';
	import { Button } from '#lib/components/ui/button/index.js';
	import * as DropdownMenu from '#lib/components/ui/dropdown-menu/index.js';
	import type { VaultEntry } from '#lib/features/vault/search.js';
	import { ITEM_TYPE_LABELS } from '#lib/schemas/item.js';
	import { ui } from '#lib/stores/ui.svelte.js';
	import { vault } from '#lib/stores/vault.svelte.js';
	import { cn } from '#lib/utils.js';
	import { errorMessage, relativeTime } from '#lib/utils/errors.js';
	import FieldRow from './FieldRow.svelte';
	import ItemIcon from './ItemIcon.svelte';
	import TotpCode from './TotpCode.svelte';

	let { entry, onback }: { entry: VaultEntry; onback?: () => void } = $props();
	const item = $derived(entry.data);
	const trashed = $derived(entry.deletedAt !== null);
	const folder = $derived(item.folderId ? vault.folders.get(item.folderId) : undefined);
	let confirmPurge = $state(false);

	function safeHref(uri: string): string | undefined {
		try {
			const url = new URL(uri.includes('://') ? uri : `https://${uri}`);
			return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : undefined;
		} catch {
			return undefined;
		}
	}

	async function act(fn: () => Promise<unknown>, success: string) {
		try {
			await fn();
			toast.success(success);
		} catch (err) {
			toast.error(errorMessage(err));
		}
	}
</script>

<article class="flex h-full animate-fade-in flex-col" aria-label={item.name}>
	<header class="flex items-center gap-3 border-b px-4 py-3">
		{#if onback}
			<Button
				variant="ghost"
				size="icon-sm"
				class="lg:hidden"
				aria-label="Back to list"
				onclick={onback}
			>
				<ArrowLeftIcon />
			</Button>
		{/if}
		<ItemIcon type={item.type} name={item.name} class="size-10" />
		<div class="min-w-0 flex-1">
			<h2 class="truncate text-base font-semibold">{item.name}</h2>
			<div class="flex items-center gap-2 text-xs text-muted-foreground">
				<span>{ITEM_TYPE_LABELS[item.type].singular}</span>
				{#if folder}<span class="flex items-center gap-1">
						<FolderIcon class="size-3" />{folder.name}
					</span>{/if}
				{#if trashed}<Badge variant="destructive">In trash</Badge>{/if}
			</div>
		</div>
		{#if trashed}
			<Button
				variant="outline"
				size="sm"
				onclick={() => act(() => vault.restore(entry.id), 'Item restored')}
			>
				<ArchiveRestoreIcon /> Restore
			</Button>
			<Button variant="destructive" size="sm" onclick={() => (confirmPurge = true)}>
				<Trash2Icon /> Delete
			</Button>
		{:else}
			<Button
				variant="ghost"
				size="icon-sm"
				aria-label={item.favorite ? 'Remove from favorites' : 'Add to favorites'}
				aria-pressed={item.favorite}
				onclick={() =>
					act(
						() => vault.toggleFavorite(entry.id),
						item.favorite ? 'Removed from favorites' : 'Added to favorites'
					)}
			>
				<StarIcon class={cn(item.favorite && 'fill-current text-warning')} />
			</Button>
			<Button variant="outline" size="sm" onclick={() => ui.editItem(entry.id)}>
				<PencilIcon /> Edit
			</Button>
			<DropdownMenu.Root>
				<DropdownMenu.Trigger>
					{#snippet child({ props })}
						<Button {...props} variant="ghost" size="icon-sm" aria-label="More actions">
							<EllipsisIcon />
						</Button>
					{/snippet}
				</DropdownMenu.Trigger>
				<DropdownMenu.Content align="end">
					<DropdownMenu.Item
						onclick={() =>
							act(async () => (ui.selectedId = await vault.duplicate(entry.id)), 'Item duplicated')}
					>
						<CopyPlusIcon /> Duplicate
					</DropdownMenu.Item>
					<DropdownMenu.Separator />
					<DropdownMenu.Item
						variant="destructive"
						onclick={() => act(() => vault.trash(entry.id), 'Moved to trash')}
					>
						<Trash2Icon /> Move to trash
					</DropdownMenu.Item>
				</DropdownMenu.Content>
			</DropdownMenu.Root>
		{/if}
	</header>

	<div class="flex-1 scrollbar-thin space-y-4 overflow-y-auto p-4">
		<section class="divide-y rounded-xl border bg-card">
			{#if item.type === 'login'}
				<FieldRow label="Username" value={item.login.username} />
				<FieldRow label="Password" value={item.login.password} secret />
				{#if item.login.totp}<TotpCode secret={item.login.totp} />{/if}
				{#each item.login.uris.filter(Boolean) as uri, i (i)}
					<FieldRow
						label={i === 0 ? 'Website' : `Website ${i + 1}`}
						value={uri}
						href={safeHref(uri)}
					/>
				{/each}
			{:else if item.type === 'card'}
				<FieldRow label="Cardholder" value={item.card.cardholderName} />
				<FieldRow label="Number" value={item.card.number} secret />
				<FieldRow label="Brand" value={item.card.brand} />
				<FieldRow
					label="Expires"
					value={item.card.expMonth || item.card.expYear
						? `${item.card.expMonth}/${item.card.expYear}`
						: ''}
					mono
				/>
				<FieldRow label="Security code" value={item.card.code} secret />
			{:else if item.type === 'identity'}
				{@const id = item.identity}
				<FieldRow
					label="Name"
					value={[id.title, id.firstName, id.middleName, id.lastName].filter(Boolean).join(' ')}
				/>
				<FieldRow label="Email" value={id.email} />
				<FieldRow label="Phone" value={id.phone} />
				<FieldRow label="Company" value={id.company} />
				<FieldRow
					label="Address"
					value={[
						id.address1,
						id.address2,
						[id.postalCode, id.city].filter(Boolean).join(' '),
						id.state,
						id.country
					]
						.filter(Boolean)
						.join('\n')}
					multiline
				/>
			{:else if item.type === 'ssh_key'}
				<FieldRow label="Fingerprint" value={item.sshKey.fingerprint} mono />
				<FieldRow label="Public key" value={item.sshKey.publicKey} mono multiline />
				<FieldRow label="Private key" value={item.sshKey.privateKey} secret multiline />
				<FieldRow label="Passphrase" value={item.sshKey.passphrase} secret />
			{/if}
			{#if item.type === 'note'}
				<FieldRow label="Note" value={item.notes} multiline />
			{/if}
		</section>

		{#if item.fields.length}
			<section class="divide-y rounded-xl border bg-card" aria-label="Custom fields">
				{#each item.fields as field, i (i)}
					<FieldRow label={field.name || 'Field'} value={field.value} secret={field.hidden} />
				{/each}
			</section>
		{/if}

		{#if item.type !== 'note' && item.notes}
			<section class="rounded-xl border bg-card">
				<FieldRow label="Notes" value={item.notes} multiline />
			</section>
		{/if}

		<p class="px-1 text-xs text-muted-foreground">
			Updated {relativeTime(entry.updatedAt)} · Created {new Date(
				entry.createdAt
			).toLocaleDateString()}
			{#if trashed && entry.deletedAt}
				· Moved to trash {relativeTime(entry.deletedAt)}{/if}
		</p>
	</div>
</article>

<ConfirmDialog
	bind:open={confirmPurge}
	title="Delete permanently?"
	description={`"${item.name}" will be deleted from the server. This cannot be undone.`}
	confirmLabel="Delete permanently"
	destructive
	onconfirm={() => act(() => vault.purge(entry.id), 'Item deleted permanently')}
/>
