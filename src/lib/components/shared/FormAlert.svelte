<script lang="ts">
	import CircleAlertIcon from '@lucide/svelte/icons/circle-alert';
	import InfoIcon from '@lucide/svelte/icons/info';
	import type { Snippet } from 'svelte';
	import { cn } from '#lib/utils.js';

	interface Props {
		variant?: 'error' | 'info' | 'warning';
		children: Snippet;
		class?: string;
	}
	let { variant = 'error', children, class: className }: Props = $props();
</script>

<div
	role={variant === 'error' ? 'alert' : 'status'}
	class={cn(
		'flex animate-slide-in gap-2.5 rounded-lg border px-3 py-2.5 text-sm',
		variant === 'error' && 'border-destructive/30 bg-destructive/10 text-destructive',
		variant === 'info' && 'border-brand/30 bg-brand-soft text-foreground',
		variant === 'warning' && 'border-warning/30 bg-warning-soft text-foreground',
		className
	)}
>
	{#if variant === 'error'}
		<CircleAlertIcon class="mt-0.5 size-4 shrink-0" />
	{:else}
		<InfoIcon class="mt-0.5 size-4 shrink-0 text-brand" />
	{/if}
	<div class="min-w-0 space-y-1">{@render children()}</div>
</div>
