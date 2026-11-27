import type { ResolvedPathname } from '$app/types';
import { resolve } from '$app/paths';
/** Sidebar navigation model. */
import type { Component } from 'svelte';
import CreditCardIcon from '@lucide/svelte/icons/credit-card';
import IdCardIcon from '@lucide/svelte/icons/id-card';
import KeyRoundIcon from '@lucide/svelte/icons/key-round';
import LayersIcon from '@lucide/svelte/icons/layers';
import StarIcon from '@lucide/svelte/icons/star';
import StickyNoteIcon from '@lucide/svelte/icons/sticky-note';
import TerminalIcon from '@lucide/svelte/icons/terminal';
import type { ItemType } from '#lib/schemas/item.js';

export const TYPE_ICONS: Record<ItemType, Component<{ class?: string }>> = {
	login: KeyRoundIcon,
	note: StickyNoteIcon,
	card: CreditCardIcon,
	identity: IdCardIcon,
	ssh_key: TerminalIcon
};

export interface NavItem {
	label: string;
	href: ResolvedPathname;
	icon: Component<{ class?: string }>;
	type?: ItemType;
	favorites?: boolean;
}

export const VAULT_NAV: NavItem[] = [
	{ label: 'All items', href: resolve('vault'), icon: LayersIcon },
	{ label: 'Favorites', href: resolve('favorites'), icon: StarIcon, favorites: true },
	{ label: 'Logins', href: resolve('vault?type=login'), icon: KeyRoundIcon, type: 'login' },
	{ label: 'Secure notes', href: resolve('vault?type=note'), icon: StickyNoteIcon, type: 'note' },
	{ label: 'Cards', href: resolve('vault?type=card'), icon: CreditCardIcon, type: 'card' },
	{
		label: 'Identities',
		href: resolve('vault?type=identity'),
		icon: IdCardIcon,
		type: 'identity'
	},
	{ label: 'SSH keys', href: resolve('vault?type=ssh_key'), icon: TerminalIcon, type: 'ssh_key' }
];
