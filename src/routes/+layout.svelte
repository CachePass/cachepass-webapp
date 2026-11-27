<script lang="ts">
	import './layout.css';
	import { ModeWatcher } from 'mode-watcher';
	import { Toaster } from '#lib/components/ui/sonner/index.js';
	import * as Tooltip from '#lib/components/ui/tooltip/index.js';
	import favicon from '#lib/assets/favicon.svg';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();

	// The Web Crypto and clipboard APIs (and Secure cookies) require a secure context.
	const secure = typeof window !== 'undefined' && window.isSecureContext;
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<ModeWatcher defaultMode="system" disableHeadScriptInjection />
<Toaster position="bottom-right" closeButton richColors={false} />

<Tooltip.Provider delayDuration={300}>
	{#if secure}
		{@render children()}
	{:else}
		<main class="mx-auto max-w-md p-8 text-sm">
			<h1 class="mb-2 text-lg font-semibold">Insecure connection</h1>
			<p class="text-muted-foreground">
				CachePass only runs over HTTPS (or on localhost during development). Your browser reports
				that this page was not loaded in a secure context, so the vault has been disabled.
			</p>
		</main>
	{/if}
</Tooltip.Provider>
