<script lang="ts">
	import GeneratorPanel from '#lib/components/shared/GeneratorPanel.svelte';
</script>

<svelte:head><title>Password generator · CachePass</title></svelte:head>

<div class="mx-auto max-w-lg space-y-6 p-4 sm:p-8">
	<div>
		<h1 class="text-xl font-semibold tracking-tight">Password generator</h1>
		<p class="text-sm text-muted-foreground">
			Generated locally from your browser's cryptographically secure random number generator.
			Nothing is sent or stored.
		</p>
	</div>
	<div class="rounded-xl border bg-card p-5"><GeneratorPanel /></div>
</div>
