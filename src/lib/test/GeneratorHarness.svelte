<!-- Test-only harness: provides the context the app root normally supplies. -->
<script lang="ts">
	import * as Tooltip from '#lib/components/ui/tooltip/index.js';
	import GeneratorPanel from '#lib/components/shared/GeneratorPanel.svelte';

	let { onuse }: { onuse?: (value: string) => void } = $props();
</script>

<Tooltip.Provider><GeneratorPanel {onuse} /></Tooltip.Provider>
