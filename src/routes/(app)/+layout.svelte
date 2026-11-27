<script lang="ts">
	import MenuIcon from '@lucide/svelte/icons/menu';
	import { onMount } from 'svelte';
	import { setUnauthorizedHandler } from '#lib/api/index.js';
	import AppSidebar from '#lib/components/layout/AppSidebar.svelte';
	import CommandPalette from '#lib/components/layout/CommandPalette.svelte';
	import Logo from '#lib/components/shared/Logo.svelte';
	import ThemeToggle from '#lib/components/shared/ThemeToggle.svelte';
	import ItemEditor from '#lib/components/vault/ItemEditor.svelte';
	import { Button } from '#lib/components/ui/button/index.js';
	import * as Sheet from '#lib/components/ui/sheet/index.js';
	import { startAutoLock } from '#lib/features/security/autolock.js';
	import { handleSessionExpired, lockVault } from '#lib/features/vault/actions.js';
	import { settings } from '#lib/stores/settings.svelte.js';
	import { ui } from '#lib/stores/ui.svelte.js';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();
	let mobileNav = $state(false);

	onMount(() => {
		setUnauthorizedHandler(() => void handleSessionExpired());
		return () => setUnauthorizedHandler(null);
	});

	$effect(() => {
		const { autoLockMinutes, lockOnHidden } = settings.value;
		return startAutoLock({
			minutes: autoLockMinutes,
			lockOnHidden,
			onLock: () => void lockVault()
		});
	});

	function isTyping(target: EventTarget | null): boolean {
		const el = target as HTMLElement | null;
		return !!el && (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName));
	}

	function onKeydown(event: KeyboardEvent) {
		const mod = event.metaKey || event.ctrlKey;
		if (mod && event.key.toLowerCase() === 'k') {
			event.preventDefault();
			ui.commandOpen = !ui.commandOpen;
		} else if (mod && event.shiftKey && event.key.toLowerCase() === 'l') {
			event.preventDefault();
			void lockVault();
		} else if (
			!mod &&
			!event.altKey &&
			!isTyping(event.target) &&
			!ui.editor.open &&
			!ui.commandOpen
		) {
			if (event.key === '/') {
				event.preventDefault();
				ui.focusSearch++;
			} else if (event.key === 'n') {
				event.preventDefault();
				ui.createItem('login');
			}
		}
	}
</script>

<svelte:window onkeydown={onKeydown} />

<div class="flex h-dvh overflow-hidden bg-background">
	<aside class="hidden w-64 shrink-0 border-r lg:block">
		<AppSidebar />
	</aside>

	<div class="flex min-w-0 flex-1 flex-col">
		<header class="flex h-12 items-center justify-between border-b px-3 lg:hidden">
			<Button
				variant="ghost"
				size="icon-sm"
				aria-label="Open navigation"
				onclick={() => (mobileNav = true)}
			>
				<MenuIcon />
			</Button>
			<Logo />
			<ThemeToggle />
		</header>
		<main class="min-h-0 flex-1">
			{@render children()}
		</main>
	</div>
</div>

<Sheet.Root bind:open={mobileNav}>
	<Sheet.Content side="left" class="w-72 p-0">
		<Sheet.Title class="sr-only">Navigation</Sheet.Title>
		<AppSidebar onnavigate={() => (mobileNav = false)} />
	</Sheet.Content>
</Sheet.Root>

<CommandPalette />
<ItemEditor />
