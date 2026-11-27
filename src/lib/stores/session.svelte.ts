/** Authenticated account state. The session token itself is an HttpOnly cookie, invisible to JS. */
import { api, ApiError, type Account } from '#lib/api/index.js';

export type SessionStatus = 'unknown' | 'anonymous' | 'authenticated';

class SessionStore {
	account = $state<Account | null>(null);
	status = $state<SessionStatus>('unknown');

	/** Ask the server who we are (quietly: a 401 just means "signed out"). */
	async refresh(): Promise<Account | null> {
		try {
			this.set(await api.auth.me(true));
		} catch (err) {
			if (err instanceof ApiError && err.status === 401) this.clear();
			else throw err;
		}
		return this.account;
	}

	set(account: Account): void {
		this.account = account;
		this.status = 'authenticated';
	}

	clear(): void {
		this.account = null;
		this.status = 'anonymous';
	}
}

export const session = new SessionStore();
