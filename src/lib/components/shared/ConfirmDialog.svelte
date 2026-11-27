<script lang="ts">
	import * as AlertDialog from '#lib/components/ui/alert-dialog/index.js';
	import { buttonVariants } from '#lib/components/ui/button/variants.js';

	interface Props {
		open: boolean;
		title: string;
		description: string;
		confirmLabel?: string;
		destructive?: boolean;
		onconfirm: () => void | Promise<void>;
	}

	let {
		open = $bindable(false),
		title,
		description,
		confirmLabel = 'Confirm',
		destructive = false,
		onconfirm
	}: Props = $props();
	let busy = $state(false);

	async function confirm() {
		busy = true;
		try {
			await onconfirm();
			open = false;
		} finally {
			busy = false;
		}
	}
</script>

<AlertDialog.Root bind:open>
	<AlertDialog.Content>
		<AlertDialog.Header>
			<AlertDialog.Title>{title}</AlertDialog.Title>
			<AlertDialog.Description>{description}</AlertDialog.Description>
		</AlertDialog.Header>
		<AlertDialog.Footer>
			<AlertDialog.Cancel disabled={busy}>Cancel</AlertDialog.Cancel>
			<AlertDialog.Action
				class={buttonVariants({ variant: destructive ? 'destructive' : 'default' })}
				disabled={busy}
				onclick={confirm}
			>
				{confirmLabel}
			</AlertDialog.Action>
		</AlertDialog.Footer>
	</AlertDialog.Content>
</AlertDialog.Root>
