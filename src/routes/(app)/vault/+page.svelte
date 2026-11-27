<script lang="ts">
	import LayersIcon from '@lucide/svelte/icons/layers';
	import { page } from '$app/state';
	import VaultBrowser from '#lib/components/vault/VaultBrowser.svelte';
	import { TYPE_ICONS } from '#lib/features/vault/navigation.js';
	import { ITEM_TYPES, ITEM_TYPE_LABELS, type ItemType } from '#lib/schemas/item.js';

	const type = $derived.by(() => {
		const raw = page.url.searchParams.get('type');
		return ITEM_TYPES.includes(raw as ItemType) ? (raw as ItemType) : null;
	});
	const label = $derived(type ? ITEM_TYPE_LABELS[type] : null);
</script>

{#key type}
	<VaultBrowser
		title={label?.plural ?? 'All items'}
		filter={{ type }}
		emptyIcon={type ? TYPE_ICONS[type] : LayersIcon}
		emptyTitle={label ? `No ${label.plural.toLowerCase()} yet` : 'Your vault is empty'}
		emptyDescription="Everything you add is encrypted in this browser before it is sent to your server."
		createType={type ?? 'login'}
	/>
{/key}
