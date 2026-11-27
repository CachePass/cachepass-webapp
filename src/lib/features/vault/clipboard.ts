/**
 * Clipboard helper. Copies only on explicit user action and clears the
 * clipboard after a timeout — best effort: browsers only allow writing while
 * the page is focused, and we only clear if the clipboard still holds our value
 * when we are able to read it.
 */
let clearTimer: ReturnType<typeof setTimeout> | null = null;

export async function copySecret(value: string, clearAfterSeconds: number): Promise<void> {
	await navigator.clipboard.writeText(value);
	if (clearTimer) clearTimeout(clearTimer);
	if (clearAfterSeconds <= 0) return;
	clearTimer = setTimeout(() => {
		clearTimer = null;
		void clearIfUnchanged(value);
	}, clearAfterSeconds * 1000);
}

async function clearIfUnchanged(value: string): Promise<void> {
	if (!document.hasFocus()) return;
	try {
		const current = await navigator.clipboard.readText();
		if (current !== value) return;
	} catch {
		// Reading may be denied; clear anyway rather than leave the secret behind.
	}
	try {
		await navigator.clipboard.writeText('');
	} catch {
		/* page lost focus */
	}
}

/** Cancel a pending clear (used on lock, where we clear immediately instead). */
export async function clearClipboardNow(): Promise<void> {
	if (clearTimer) {
		clearTimeout(clearTimer);
		clearTimer = null;
		try {
			if (document.hasFocus()) await navigator.clipboard.writeText('');
		} catch {
			/* ignore */
		}
	}
}
