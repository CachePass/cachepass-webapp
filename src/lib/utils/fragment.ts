/**
 * Read a single-use token from the URL fragment (`#token=…`) and remove it
 * from the address bar and history, so it is not kept in browser history or
 * leaked through screenshots.
 */
export function takeFragmentToken(): string | null {
	if (typeof window === 'undefined') return null;
	const params = new URLSearchParams(window.location.hash.slice(1));
	const token = params.get('token');
	if (token) history.replaceState(history.state, '', window.location.pathname);
	return token && /^[A-Za-z0-9_-]{43}$/.test(token) ? token : null;
}
