/**
 * Clipboard helper. Copies only on explicit user action and clears the
 * clipboard after a timeout or on lock.
 *
 * Best effort: browsers only allow clipboard writes while the page has focus.
 * When a clear is due but the page is not focused, it is deferred to the next
 * time the window regains focus rather than dropped. We only overwrite the
 * clipboard if it still holds our value (when the browser lets us read it).
 */
let clearTimer: ReturnType<typeof setTimeout> | null = null;
/** The secret we last copied, kept only until it has been cleared. */
let pendingValue: string | null = null;
let focusListener: (() => void) | null = null;

export async function copySecret(value: string, clearAfterSeconds: number): Promise<void> {
	await navigator.clipboard.writeText(value);
	cancelPending();
	if (clearAfterSeconds <= 0) return;
	pendingValue = value;
	clearTimer = setTimeout(() => {
		clearTimer = null;
		void clearPending();
	}, clearAfterSeconds * 1000);
}

/** Clear a pending secret now (used on lock), or as soon as the page is focused again. */
export async function clearClipboardNow(): Promise<void> {
	if (clearTimer) {
		clearTimeout(clearTimer);
		clearTimer = null;
	}
	await clearPending();
}

function cancelPending(): void {
	if (clearTimer) clearTimeout(clearTimer);
	clearTimer = null;
	if (focusListener) window.removeEventListener('focus', focusListener);
	focusListener = null;
	pendingValue = null;
}

async function clearPending(): Promise<void> {
	const value = pendingValue;
	if (value === null) return;
	if (!document.hasFocus()) {
		if (!focusListener) {
			focusListener = () => {
				focusListener = null;
				void clearPending();
			};
			window.addEventListener('focus', focusListener, { once: true });
		}
		return;
	}
	await clearIfUnchanged(value);
	if (pendingValue === value) pendingValue = null;
}

async function clearIfUnchanged(value: string): Promise<void> {
	try {
		const current = await navigator.clipboard.readText();
		if (current !== value) return;
	} catch {
		// Reading may be denied; clear anyway rather than leave the secret behind.
	}
	try {
		await navigator.clipboard.writeText('');
	} catch {
		/* focus was lost between the check and the write */
	}
}
