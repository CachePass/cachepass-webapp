<script lang="ts">
	import { estimateStrength } from '#lib/features/security/strength.js';
	import { cn } from '#lib/utils.js';

	let { password, showFeedback = true }: { password: string; showFeedback?: boolean } = $props();
	const result = $derived(estimateStrength(password));
	const colors = ['bg-destructive', 'bg-destructive', 'bg-warning', 'bg-brand', 'bg-brand'];
</script>

<div class="space-y-1.5" aria-live="polite">
	<div class="flex gap-1" aria-hidden="true">
		{#each [0, 1, 2, 3] as i (i)}
			<div
				class={cn(
					'h-1 flex-1 rounded-full bg-muted transition-colors duration-200',
					password && i < Math.max(1, result.score) && colors[result.score]
				)}
			></div>
		{/each}
	</div>
	{#if password}
		<p class="text-xs text-muted-foreground">
			<span class="font-medium text-foreground">{result.label}</span>
			<span class="text-muted-foreground"> · ~{result.bits} bits (estimate)</span>
			{#if showFeedback && result.feedback.length}
				<span class="block">{result.feedback[0]}</span>
			{/if}
		</p>
	{/if}
</div>
