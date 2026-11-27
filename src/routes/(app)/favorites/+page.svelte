<script lang="ts">
	import StarIcon from '@lucide/svelte/icons/star';
	import VaultBrowser from '#lib/components/vault/VaultBrowser.svelte';
</script>

<VaultBrowser
	title="Favorites"
	filter={{ favorites: true }}
	emptyIcon={StarIcon}
	emptyTitle="No favorites"
	emptyDescription="Star an item to keep it here."
	allowCreate={false}
/>
