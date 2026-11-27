<script lang="ts" module>
	import type { ResolvedPathname } from '$app/types';
	import { buttonVariants, type ButtonSize, type ButtonVariant } from './variants.js';
	import { cn, type WithElementRef } from '#lib/utils.js';
	import type { HTMLAnchorAttributes, HTMLButtonAttributes } from 'svelte/elements';

	// Internal links must be built with resolve() from $app/paths; external links
	// should use a plain <a rel="external"> instead of a Button.
	export type ButtonProps = WithElementRef<HTMLButtonAttributes> &
		WithElementRef<Omit<HTMLAnchorAttributes, 'href'>> & {
			href?: ResolvedPathname;
			variant?: ButtonVariant;
			size?: ButtonSize;
		};
</script>

<script lang="ts">
	let {
		class: className,
		variant = 'default',
		size = 'default',
		ref = $bindable(null),
		href = undefined,
		type = 'button',
		disabled,
		children,
		...restProps
	}: ButtonProps = $props();
</script>

{#if href}
	<a
		bind:this={ref}
		data-slot="button"
		class={cn(buttonVariants({ variant, size }), className)}
		href={disabled ? undefined : href}
		aria-disabled={disabled}
		role={disabled ? 'link' : undefined}
		tabindex={disabled ? -1 : undefined}
		{...restProps}
	>
		{@render children?.()}
	</a>
{:else}
	<button
		bind:this={ref}
		data-slot="button"
		class={cn(buttonVariants({ variant, size }), className)}
		{type}
		{disabled}
		{...restProps}
	>
		{@render children?.()}
	</button>
{/if}
