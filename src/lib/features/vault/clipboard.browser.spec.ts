/**
 * Clipboard clearing in a real browser. Focus is simulated by overriding
 * document.hasFocus, since headless pages do not get OS-level focus changes.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { clearClipboardNow, copySecret } from './clipboard';

let focused = true;
vi.spyOn(document, 'hasFocus').mockImplementation(() => focused);
const written: string[] = [];
let clipboard = '';
Object.defineProperty(navigator, 'clipboard', {
	configurable: true,
	value: {
		writeText: (v: string) => {
			written.push(v);
			clipboard = v;
			return Promise.resolve();
		},
		readText: () => Promise.resolve(clipboard)
	}
});

afterEach(() => {
	focused = true;
	written.length = 0;
	vi.useRealTimers();
});

describe('clipboard clearing', () => {
	it('clears the secret after the timeout', async () => {
		vi.useFakeTimers();
		await copySecret('s3cret', 30);
		await vi.advanceTimersByTimeAsync(30_000);
		expect(clipboard).toBe('');
	});

	it('does not clobber something the user copied afterwards', async () => {
		vi.useFakeTimers();
		await copySecret('s3cret', 30);
		clipboard = 'something else';
		await vi.advanceTimersByTimeAsync(30_000);
		expect(clipboard).toBe('something else');
	});

	it('defers the clear on lock until focus returns instead of dropping it', async () => {
		await copySecret('locked-secret', 30);
		focused = false;
		await clearClipboardNow();
		expect(clipboard).toBe('locked-secret');
		focused = true;
		window.dispatchEvent(new Event('focus'));
		await vi.waitFor(() => expect(clipboard).toBe(''));
	});

	it('defers a timed clear that fires while the page is hidden', async () => {
		vi.useFakeTimers();
		await copySecret('hidden-secret', 15);
		focused = false;
		await vi.advanceTimersByTimeAsync(15_000);
		expect(clipboard).toBe('hidden-secret');
		focused = true;
		window.dispatchEvent(new Event('focus'));
		await vi.advanceTimersByTimeAsync(0);
		expect(clipboard).toBe('');
	});
});
