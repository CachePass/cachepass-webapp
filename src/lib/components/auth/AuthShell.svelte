<script lang="ts">
	import { resolve } from '$app/paths';
	import type { Snippet } from 'svelte';
	import Logo from '#lib/components/shared/Logo.svelte';
	import ThemeToggle from '#lib/components/shared/ThemeToggle.svelte';

	interface Props {
		title: string;
		description?: string;
		children: Snippet;
		footer?: Snippet;
	}
	let { title, description, children, footer }: Props = $props();
</script>

<svelte:head><title>{title} · CachePass</title></svelte:head>

<div class="flex min-h-dvh flex-col bg-background">
	<header class="flex items-center justify-between px-5 py-4">
		<a href={resolve('/')} class="rounded-md focus-visible:outline-2 focus-visible:outline-ring">
			<Logo />
		</a>
		<ThemeToggle />
	</header>
	<main class="flex flex-1 items-start justify-center px-4 pt-[6vh] pb-16 sm:items-center sm:pt-0">
		<div class="w-full max-w-sm animate-slide-in">
			<div class="mb-6 space-y-1.5">
				<h1 class="text-xl font-semibold tracking-tight">{title}</h1>
				{#if description}<p class="text-sm text-muted-foreground">{description}</p>{/if}
			</div>
			<div class="rounded-xl border bg-card p-5 shadow-xs sm:p-6">
				{@render children()}
			</div>
			{#if footer}<div class="mt-5 text-center text-sm text-muted-foreground">
					{@render footer()}
				</div>{/if}
		</div>
	</main>
</div>
