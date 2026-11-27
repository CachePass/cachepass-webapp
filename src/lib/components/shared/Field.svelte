<script lang="ts">
	import type { Snippet } from 'svelte';
	import { Label } from '#lib/components/ui/label/index.js';

	interface Props {
		id: string;
		label: string;
		error?: string;
		hint?: string;
		children: Snippet;
	}
	let { id, label, error, hint, children }: Props = $props();
</script>

<div class="space-y-1.5">
	<Label for={id}>{label}</Label>
	{@render children()}
	{#if error}
		<p id={`${id}-error`} class="text-xs text-destructive">{error}</p>
	{:else if hint}
		<p id={`${id}-hint`} class="text-xs text-muted-foreground">{hint}</p>
	{/if}
</div>
