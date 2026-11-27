<script lang="ts">
	import MoonIcon from '@lucide/svelte/icons/moon';
	import SunIcon from '@lucide/svelte/icons/sun';
	import { mode, toggleMode } from 'mode-watcher';
	import { Button } from '#lib/components/ui/button/index.js';
</script>

<Button
	variant="ghost"
	size="icon-sm"
	onclick={toggleMode}
	aria-label={mode.current === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
>
	{#if mode.current === 'dark'}<SunIcon />{:else}<MoonIcon />{/if}
</Button>
