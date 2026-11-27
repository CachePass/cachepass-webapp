<script lang="ts">
	import { resolve } from '$app/paths';
	import { analyzeVault } from '#lib/features/security/health.js';
	import { ui } from '#lib/stores/ui.svelte.js';
	import { vault } from '#lib/stores/vault.svelte.js';
	import { goto } from '$app/navigation';
	import Panel from './Panel.svelte';

	const report = $derived(analyzeVault(vault.list));

	async function open(id: string) {
		await goto(resolve('vault?type=login'));
		ui.selectedId = id;
	}
</script>

<Panel
	id="health"
	title="Vault health"
	description="Computed locally from your decrypted logins. Nothing is sent to the server."
>
	<dl class="grid grid-cols-3 gap-3 text-center">
		<div class="rounded-lg bg-muted/50 p-3">
			<dt class="text-xs text-muted-foreground">Weak</dt>
			<dd class="text-2xl font-semibold tabular-nums">{report.weak.length}</dd>
		</div>
		<div class="rounded-lg bg-muted/50 p-3">
			<dt class="text-xs text-muted-foreground">Reused</dt>
			<dd class="text-2xl font-semibold tabular-nums">
				{report.reused.reduce((n, g) => n + g.length, 0)}
			</dd>
		</div>
		<div class="rounded-lg bg-muted/50 p-3">
			<dt class="text-xs text-muted-foreground">Without 2FA code</dt>
			<dd class="text-2xl font-semibold tabular-nums">{report.withoutTotp}</dd>
		</div>
	</dl>
	{#if report.weak.length || report.reused.length}
		<ul class="mt-4 space-y-1 text-sm">
			{#each report.weak as entry (entry.id)}
				<li>
					<button class="hover:underline" onclick={() => open(entry.id)}>{entry.data.name}</button>
					<span class="text-muted-foreground">— weak password</span>
				</li>
			{/each}
			{#each report.reused as group, i (i)}
				<li>
					{#each group as entry, j (entry.id)}<button
							class="hover:underline"
							onclick={() => open(entry.id)}
						>
							{entry.data.name}
						</button>{j < group.length - 1 ? ', ' : ''}{/each}
					<span class="text-muted-foreground">— share the same password</span>
				</li>
			{/each}
		</ul>
	{:else if report.logins}
		<p class="mt-4 text-sm text-muted-foreground">
			No weak or reused passwords found among {report.logins} logins.
		</p>
	{/if}
</Panel>
