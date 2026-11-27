<script lang="ts">
	import Trash2Icon from '@lucide/svelte/icons/trash-2';
	import VaultBrowser from '#lib/components/vault/VaultBrowser.svelte';
</script>

<VaultBrowser
	title="Trash"
	filter={{ trash: true }}
	emptyIcon={Trash2Icon}
	emptyTitle="Trash is empty"
	emptyDescription="Deleted items stay here for 30 days (server setting) and can be restored until then."
	allowCreate={false}
/>
