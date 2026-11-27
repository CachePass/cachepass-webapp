<script lang="ts">
	import CheckIcon from '@lucide/svelte/icons/check';
	import CopyIcon from '@lucide/svelte/icons/copy';
	import { toast } from 'svelte-sonner';
	import { Button } from '#lib/components/ui/button/index.js';
	import * as Tooltip from '#lib/components/ui/tooltip/index.js';
	import { copySecret } from '#lib/features/vault/clipboard.js';
	import { settings } from '#lib/stores/settings.svelte.js';

	interface Props {
		value: string;
		label: string;
		/** Secrets are cleared from the clipboard after the configured timeout. */
		secret?: boolean;
	}

	let { value, label, secret = false }: Props = $props();
	let copied = $state(false);
	let resetTimer: ReturnType<typeof setTimeout> | undefined;

	async function copy() {
		try {
			const seconds = secret ? settings.value.clipboardClearSeconds : 0;
			await copySecret(value, seconds);
			copied = true;
			clearTimeout(resetTimer);
			resetTimer = setTimeout(() => (copied = false), 1500);
			toast.success(`${label} copied`, {
				description: secret && seconds > 0 ? `Clipboard clears in ${seconds} seconds.` : undefined
			});
		} catch {
			// Never include the value in error messages.
			toast.error('Could not copy to the clipboard.');
		}
	}
</script>

<Tooltip.Root>
	<Tooltip.Trigger>
		{#snippet child({ props })}
			<Button
				{...props}
				variant="ghost"
				size="icon-sm"
				aria-label={`Copy ${label.toLowerCase()}`}
				onclick={copy}
				disabled={!value}
			>
				{#if copied}<CheckIcon class="text-brand" />{:else}<CopyIcon />{/if}
			</Button>
		{/snippet}
	</Tooltip.Trigger>
	<Tooltip.Content>Copy {label.toLowerCase()}</Tooltip.Content>
</Tooltip.Root>
