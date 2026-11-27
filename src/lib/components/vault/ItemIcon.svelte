<script lang="ts">
	import { TYPE_ICONS } from '#lib/features/vault/navigation.js';
	import type { ItemType } from '#lib/schemas/item.js';
	import { cn } from '#lib/utils.js';

	let { type, name, class: className }: { type: ItemType; name: string; class?: string } = $props();
	const Icon = $derived(TYPE_ICONS[type]);
</script>

<span
	class={cn(
		'relative flex size-8 shrink-0 items-center justify-center rounded-lg border bg-card text-muted-foreground',
		className
	)}
	aria-hidden="true"
>
	{#if type === 'login' && name}
		<span class="text-xs font-semibold text-foreground uppercase">{name.slice(0, 1)}</span>
		<Icon class="absolute -right-1 -bottom-1 size-3.5 rounded bg-background p-px text-brand" />
	{:else}
		<Icon class="size-4" />
	{/if}
</span>
