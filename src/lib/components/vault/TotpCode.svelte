<script lang="ts">
	import CopyButton from '#lib/components/shared/CopyButton.svelte';
	import {
		parseTotp,
		secondsRemaining,
		totpAt,
		type TotpConfig
	} from '#lib/features/vault/totp.js';

	let { secret }: { secret: string } = $props();
	let code = $state('');
	let remaining = $state(30);
	let invalid = $state(false);

	$effect(() => {
		let config: TotpConfig;
		try {
			config = parseTotp(secret);
			invalid = false;
		} catch {
			invalid = true;
			return;
		}
		let cancelled = false;
		const tick = async () => {
			const now = Date.now() / 1000;
			remaining = secondsRemaining(config, now);
			const next = await totpAt(config, now);
			if (!cancelled) code = next;
		};
		void tick();
		const interval = setInterval(() => void tick(), 1000);
		return () => {
			cancelled = true;
			clearInterval(interval);
		};
	});
</script>

<div class="flex items-center gap-2 px-4 py-2.5">
	<div class="min-w-0 flex-1">
		<div class="text-xs text-muted-foreground">One-time code</div>
		{#if invalid}
			<div class="text-sm text-destructive">Invalid TOTP secret</div>
		{:else}
			<div class="flex items-center gap-2">
				<span class="font-secret text-lg tracking-[0.2em]" aria-live="off">
					{code.slice(0, 3)}
					{code.slice(3)}
				</span>
				<span
					class="text-xs text-muted-foreground tabular-nums"
					aria-label={`${remaining} seconds remaining`}
				>
					{remaining}s
				</span>
				<svg class="size-4 -rotate-90" viewBox="0 0 20 20" aria-hidden="true">
					<circle cx="10" cy="10" r="8" fill="none" stroke="var(--border)" stroke-width="2.5" />
					<circle
						cx="10"
						cy="10"
						r="8"
						fill="none"
						stroke="var(--brand)"
						stroke-width="2.5"
						stroke-dasharray={50.27}
						stroke-dashoffset={50.27 * (1 - remaining / 30)}
						class="transition-[stroke-dashoffset] duration-1000 ease-linear"
					/>
				</svg>
			</div>
		{/if}
	</div>
	{#if !invalid}<CopyButton value={code} label="One-time code" secret />{/if}
</div>
