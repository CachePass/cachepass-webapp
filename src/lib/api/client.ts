/**
 * Fetch wrapper for the CachePass API.
 *
 * - Same-origin by default (`/api/v1`); cookies are HttpOnly and handled by the browser.
 * - Sends the CSRF token (kept in memory only) on unsafe methods and refreshes it once on `csrf_failed`.
 * - Validates every response body with Zod.
 * - Never logs request or response bodies.
 */
import type { z } from 'zod';
import { csrfSchema, errorBodySchema } from './schemas';

const BASE = '/api/v1';

export class ApiError extends Error {
	constructor(
		public readonly status: number,
		public readonly code: string,
		message: string,
		public readonly fields: { field: string; message: string }[] = [],
		public readonly currentRevision?: number
	) {
		super(message);
		this.name = 'ApiError';
	}

	fieldMessage(field: string): string | undefined {
		return this.fields.find((f) => f.field === field)?.message;
	}
}

type UnauthorizedHandler = () => void;
let onUnauthorized: UnauthorizedHandler | null = null;
let csrfToken: string | null = null;

/** Called when an authenticated request returns 401 (session expired or revoked). */
export function setUnauthorizedHandler(handler: UnauthorizedHandler | null): void {
	onUnauthorized = handler;
}

async function fetchCsrf(): Promise<string> {
	const res = await fetch(`${BASE}/auth/csrf`, { credentials: 'same-origin', cache: 'no-store' });
	if (!res.ok) throw new ApiError(res.status, 'csrf_unavailable', 'Could not reach the server.');
	csrfToken = csrfSchema.parse(await res.json()).token;
	return csrfToken;
}

async function toError(res: Response): Promise<ApiError> {
	try {
		const parsed = errorBodySchema.safeParse(await res.json());
		if (parsed.success) {
			const e = parsed.data.error;
			return new ApiError(res.status, e.code, e.message, e.fields ?? [], e.current_revision);
		}
	} catch {
		/* non-JSON error body */
	}
	return new ApiError(res.status, 'http_error', `Request failed (${res.status}).`);
}

export interface RequestOptions {
	/** Do not trigger the global 401 handler (used by login/unlock probes). */
	quiet401?: boolean;
	query?: Record<string, string | number | boolean | undefined | null>;
}

export async function request<S extends z.ZodType | null>(
	method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
	path: string,
	schema: S,
	body?: unknown,
	options: RequestOptions = {}
): Promise<S extends z.ZodType ? z.infer<S> : void> {
	const unsafe = method !== 'GET';
	let url = `${BASE}${path}`;
	if (options.query) {
		const params = new URLSearchParams();
		for (const [k, v] of Object.entries(options.query))
			if (v !== undefined && v !== null) params.set(k, String(v));
		const qs = params.toString();
		if (qs) url += `?${qs}`;
	}

	const send = async (token: string | null) =>
		fetch(url, {
			method,
			credentials: 'same-origin',
			cache: 'no-store',
			headers: {
				...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
				...(unsafe && token ? { 'X-CSRF-Token': token } : {})
			},
			body: body !== undefined ? JSON.stringify(body) : undefined
		});

	let res: Response;
	try {
		res = await send(unsafe ? (csrfToken ?? (await fetchCsrf())) : null);
		if (res.status === 403 && unsafe) {
			const err = await toError(res.clone());
			if (err.code === 'csrf_failed') res = await send(await fetchCsrf());
		}
	} catch (err) {
		if (err instanceof ApiError) throw err;
		throw new ApiError(0, 'network_error', 'Could not reach the server. Check your connection.');
	}

	if (!res.ok) {
		const err = await toError(res);
		if (res.status === 401 && err.code === 'unauthorized' && !options.quiet401) onUnauthorized?.();
		throw err;
	}
	if (schema === null || res.status === 204) return undefined as never;
	const json: unknown = await res.json();
	const parsed = schema.safeParse(json);
	if (!parsed.success)
		throw new ApiError(
			res.status,
			'invalid_response',
			'The server returned an unexpected response.'
		);
	return parsed.data as never;
}

/** Forget the in-memory CSRF token (after logout). */
export function resetCsrf(): void {
	csrfToken = null;
}
