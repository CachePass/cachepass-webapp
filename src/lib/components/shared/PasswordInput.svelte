<script lang="ts">
	import EyeIcon from '@lucide/svelte/icons/eye';
	import EyeOffIcon from '@lucide/svelte/icons/eye-off';
	import type { HTMLInputAttributes } from 'svelte/elements';
	import { Input } from '#lib/components/ui/input/index.js';
	import { cn } from '#lib/utils.js';

	type Props = Omit<HTMLInputAttributes, 'type' | 'value' | 'files'> & {
		value: string;
		ref?: HTMLInputElement | null;
	};

	let { value = $bindable(''), ref = $bindable(null), class: className, ...rest }: Props = $props();
	let visible = $state(false);
</script>

<div class="relative">
	<Input
		bind:ref
		bind:value
		type={visible ? 'text' : 'password'}
		spellcheck="false"
		autocapitalize="off"
		class={cn('pr-10 font-secret', className)}
		{...rest}
	/>
	<button
		type="button"
		class="absolute inset-y-0 right-0 flex w-9 items-center justify-center rounded-r-lg text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
		aria-label={visible ? 'Hide password' : 'Show password'}
		aria-pressed={visible}
		onclick={() => (visible = !visible)}
	>
		{#if visible}<EyeOffIcon class="size-4" />{:else}<EyeIcon class="size-4" />{/if}
	</button>
</div>
