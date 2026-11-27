<script lang="ts">
	import { cn } from '#lib/utils.js';
	import LogoMark from './LogoMark.svelte';

	let { class: className, compact = false }: { class?: string; compact?: boolean } = $props();
</script>

<span class={cn('inline-flex items-center gap-2 font-semibold tracking-tight', className)}>
	<LogoMark />
	{#if !compact}<span>CachePass</span>{/if}
</span>
