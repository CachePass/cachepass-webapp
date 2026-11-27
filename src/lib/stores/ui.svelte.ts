/** Cross-component UI state (command palette, item editor). Contains no secrets. */
import type { ItemType } from '#lib/schemas/item.js';

export type EditorState =
	| { open: false }
	| { open: true; mode: 'create'; type: ItemType; folderId: string | null }
	| { open: true; mode: 'edit'; itemId: string };

class UiStore {
	commandOpen = $state(false);
	editor = $state<EditorState>({ open: false });
	selectedId = $state<string | null>(null);
	/** Incremented to ask the vault list to focus its search box. */
	focusSearch = $state(0);

	createItem(type: ItemType, folderId: string | null = null): void {
		this.editor = { open: true, mode: 'create', type, folderId };
	}

	editItem(itemId: string): void {
		this.editor = { open: true, mode: 'edit', itemId };
	}

	closeEditor(): void {
		this.editor = { open: false };
	}

	reset(): void {
		this.commandOpen = false;
		this.editor = { open: false };
		this.selectedId = null;
	}
}

export const ui = new UiStore();
