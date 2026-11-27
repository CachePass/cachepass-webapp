<script lang="ts">
	import type { Component, Snippet } from 'svelte';

	interface Props {
		icon: Component<{ class?: string }>;
		title: string;
		description?: string;
		children?: Snippet;
	}
	let { icon: Icon, title, description, children }: Props = $props();
</script>

<div
	class="flex h-full animate-fade-in flex-col items-center justify-center gap-3 px-6 py-12 text-center"
>
	<div
		class="flex size-11 items-center justify-center rounded-xl border bg-card text-muted-foreground"
	>
		<Icon class="size-5" />
	</div>
	<div class="space-y-1">
		<p class="text-sm font-medium">{title}</p>
		{#if description}<p class="max-w-xs text-sm text-muted-foreground">{description}</p>{/if}
	</div>
	{@render children?.()}
</div>
