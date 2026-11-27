<script lang="ts">
	import { cn } from '#lib/utils.js';

	interface Props {
		class?: string;
	}

	let { class: className }: Props = $props();
</script>

<!--
	The CachePass mark: a 2×2 grid of cache cells. Three are opaque storage;
	the fourth, holding the keyhole, is the one only you can open.
-->
<svg
	viewBox="0 0 32 32"
	fill="none"
	aria-hidden="true"
	class={cn('size-7 shrink-0', className)}
	xmlns="http://www.w3.org/2000/svg"
>
	<rect width="32" height="32" rx="8" fill="#121a18" />
	<rect x="5" y="5" width="10" height="10" rx="2.5" fill="#3b4c47" />
	<rect x="17" y="5" width="10" height="10" rx="2.5" fill="#3b4c47" />
	<rect x="5" y="17" width="10" height="10" rx="2.5" fill="#3b4c47" />
	<rect x="17" y="17" width="10" height="10" rx="2.5" fill="#6ad5b2" />
	<circle cx="22" cy="21" r="1.9" fill="#121a18" />
	<path d="M21 21.5h2l.45 3.2h-2.9z" fill="#121a18" />
</svg>
