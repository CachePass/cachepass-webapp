/**
 * Idle auto-lock. Any user activity resets the timer; when it fires the vault
 * is locked (key destroyed, plaintext dropped). Optionally locks when the tab
 * is hidden.
 */
export interface AutoLockOptions {
	minutes: number;
	lockOnHidden: boolean;
	onLock: () => void;
}

const ACTIVITY_EVENTS = ['pointerdown', 'keydown', 'wheel', 'touchstart', 'mousemove'] as const;

export function startAutoLock(options: AutoLockOptions): () => void {
	let timer: ReturnType<typeof setTimeout> | undefined;
	let lastReset = 0;
	const ms = options.minutes * 60_000;

	const reset = () => {
		const now = Date.now();
		if (now - lastReset < 1000) return; // throttle mousemove storms
		lastReset = now;
		clearTimeout(timer);
		timer = setTimeout(options.onLock, ms);
	};
	const onVisibility = () => {
		if (options.lockOnHidden && document.visibilityState === 'hidden') options.onLock();
	};

	for (const e of ACTIVITY_EVENTS) window.addEventListener(e, reset, { passive: true });
	document.addEventListener('visibilitychange', onVisibility);
	reset();

	return () => {
		clearTimeout(timer);
		for (const e of ACTIVITY_EVENTS) window.removeEventListener(e, reset);
		document.removeEventListener('visibilitychange', onVisibility);
	};
}
