import type { Config } from 'tailwindcss';

/**
 * Static theme tokens loaded by Tailwind CSS v4 through `@config` in
 * src/routes/layout.css. Colour tokens are CSS variables in that stylesheet so
 * they can switch between the light and dark themes.
 */
export default {
	theme: {
		extend: {
			fontFamily: {
				sans: ['"Geist Variable"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
				mono: ['"Geist Mono Variable"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace']
			},
			keyframes: {
				'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
				'slide-in': {
					from: { opacity: '0', transform: 'translateY(4px)' },
					to: { opacity: '1', transform: 'translateY(0)' }
				}
			},
			animation: {
				'fade-in': 'fade-in 150ms ease-out both',
				'slide-in': 'slide-in 180ms cubic-bezier(0.2, 0.7, 0.2, 1) both'
			}
		}
	}
} satisfies Config;
