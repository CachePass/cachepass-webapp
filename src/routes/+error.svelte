<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { Button } from '#lib/components/ui/button/index.js';
	import Logo from '#lib/components/shared/Logo.svelte';
</script>

<main class="flex min-h-dvh flex-col items-center justify-center gap-4 p-6 text-center">
	<Logo />
	<h1 class="text-2xl font-semibold">
		{page.status === 404 ? 'Page not found' : 'Something went wrong'}
	</h1>
	<p class="max-w-sm text-sm text-muted-foreground">
		{page.status === 404
			? 'This page does not exist.'
			: 'An unexpected error occurred. No vault data was sent anywhere.'}
	</p>
	<Button href={resolve('/')}>Go to CachePass</Button>
</main>
