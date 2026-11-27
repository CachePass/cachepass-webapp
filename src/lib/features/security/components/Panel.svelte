<script lang="ts">
	import type { Snippet } from 'svelte';
	interface Props {
		title: string;
		description?: string;
		children: Snippet;
		actions?: Snippet;
		id?: string;
	}
	let { title, description, children, actions, id }: Props = $props();
</script>

<section {id} class="rounded-xl border bg-card" aria-labelledby={id ? `${id}-title` : undefined}>
	<header class="flex items-start justify-between gap-4 border-b px-5 py-4">
		<div class="space-y-0.5">
			<h2 id={id ? `${id}-title` : undefined} class="text-sm font-semibold">{title}</h2>
			{#if description}<p class="text-sm text-muted-foreground">{description}</p>{/if}
		</div>
		{@render actions?.()}
	</header>
	<div class="p-5">{@render children()}</div>
</section>
