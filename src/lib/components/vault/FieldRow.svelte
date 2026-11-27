<script lang="ts">
	import EyeIcon from '@lucide/svelte/icons/eye';
	import EyeOffIcon from '@lucide/svelte/icons/eye-off';
	import CopyButton from '#lib/components/shared/CopyButton.svelte';
	import { Button } from '#lib/components/ui/button/index.js';
	import { cn } from '#lib/utils.js';

	interface Props {
		label: string;
		value: string;
		secret?: boolean;
		mono?: boolean;
		multiline?: boolean;
		href?: string;
	}
	let { label, value, secret = false, mono = false, multiline = false, href }: Props = $props();
	let revealed = $state(false);
</script>

{#if value}
	<div class="group flex items-start gap-2 px-4 py-2.5">
		<div class="min-w-0 flex-1">
			<div class="text-xs text-muted-foreground">{label}</div>
			{#if secret && !revealed}
				<div class="font-secret text-sm tracking-widest select-none" aria-label={`${label} hidden`}>
					••••••••••••
				</div>
			{:else if href}
				<a
					{href}
					target="_blank"
					rel="external noopener noreferrer"
					class="block truncate text-sm text-brand underline-offset-2 hover:underline"
				>
					{value}
				</a>
			{:else}
				<div
					class={cn(
						'text-sm break-words',
						(mono || secret) && 'font-secret',
						multiline && 'whitespace-pre-wrap'
					)}
				>
					{value}
				</div>
			{/if}
		</div>
		<div
			class="flex shrink-0 items-center gap-0.5 opacity-70 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100"
		>
			{#if secret}
				<Button
					variant="ghost"
					size="icon-sm"
					aria-label={revealed ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
					aria-pressed={revealed}
					onclick={() => (revealed = !revealed)}
				>
					{#if revealed}<EyeOffIcon />{:else}<EyeIcon />{/if}
				</Button>
			{/if}
			<CopyButton {value} {label} {secret} />
		</div>
	</div>
{/if}
