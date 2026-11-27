/**
 * User preferences. Only NON-sensitive values are persisted to localStorage;
 * vault data, keys and tokens are never written to browser storage.
 */
import type { SortKey } from '#lib/features/vault/search.js';

export interface Settings {
	autoLockMinutes: number;
	clipboardClearSeconds: number;
	lockOnHidden: boolean;
	sort: SortKey;
}

export const DEFAULT_SETTINGS: Settings = {
	autoLockMinutes: 15,
	clipboardClearSeconds: 30,
	lockOnHidden: false,
	sort: 'name'
};

const KEY = 'cachepass.settings.v1';
export const AUTO_LOCK_OPTIONS = [1, 5, 15, 30, 60, 240] as const;
export const CLIPBOARD_OPTIONS = [0, 15, 30, 60, 120] as const;

function sanitize(raw: unknown): Settings {
	const value = (typeof raw === 'object' && raw !== null ? raw : {}) as Partial<Settings>;
	return {
		autoLockMinutes: AUTO_LOCK_OPTIONS.includes(value.autoLockMinutes as never)
			? (value.autoLockMinutes as number)
			: DEFAULT_SETTINGS.autoLockMinutes,
		clipboardClearSeconds: CLIPBOARD_OPTIONS.includes(value.clipboardClearSeconds as never)
			? (value.clipboardClearSeconds as number)
			: DEFAULT_SETTINGS.clipboardClearSeconds,
		lockOnHidden:
			typeof value.lockOnHidden === 'boolean' ? value.lockOnHidden : DEFAULT_SETTINGS.lockOnHidden,
		sort:
			value.sort === 'updated' || value.sort === 'created' || value.sort === 'name'
				? value.sort
				: 'name'
	};
}

function load(): Settings {
	if (typeof localStorage === 'undefined') return { ...DEFAULT_SETTINGS };
	try {
		return sanitize(JSON.parse(localStorage.getItem(KEY) ?? '{}'));
	} catch {
		return { ...DEFAULT_SETTINGS };
	}
}

class SettingsStore {
	value = $state<Settings>(load());

	update(patch: Partial<Settings>): void {
		this.value = sanitize({ ...this.value, ...patch });
		try {
			localStorage.setItem(KEY, JSON.stringify(this.value));
		} catch {
			/* storage unavailable: keep in memory */
		}
	}
}

export const settings = new SettingsStore();
export { sanitize as sanitizeSettings };
