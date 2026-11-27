/**
 * Main-thread facade over the crypto worker. Every call is async; secrets are
 * passed to the worker by structured clone and never stored on this side.
 */
import type { EngineApi, EngineMethod, EngineRequest, EngineResponse } from './protocol';
import { CryptoError } from './types';

type Async<T> = {
	[K in keyof T]: T[K] extends (...args: infer A) => infer R ? (...args: A) => Promise<R> : never;
};

let worker: Worker | null = null;
let nextId = 1;
const pending = new Map<number, { resolve: (v: unknown) => void; reject: (e: unknown) => void }>();

function getWorker(): Worker {
	if (worker) return worker;
	worker = new Worker(new URL('./worker.ts', import.meta.url), {
		type: 'module',
		name: 'cachepass-crypto'
	});
	worker.onmessage = (event: MessageEvent<EngineResponse>) => {
		const entry = pending.get(event.data.id);
		if (!entry) return;
		pending.delete(event.data.id);
		if (event.data.ok) entry.resolve(event.data.result);
		else entry.reject(new CryptoError(event.data.code));
	};
	worker.onerror = () => {
		for (const entry of pending.values()) entry.reject(new CryptoError('engine_unavailable'));
		pending.clear();
		worker?.terminate();
		worker = null;
	};
	return worker;
}

function call(method: EngineMethod, args: unknown[]): Promise<unknown> {
	return new Promise((resolve, reject) => {
		const id = nextId++;
		pending.set(id, { resolve, reject });
		const request: EngineRequest = { id, method, args };
		getWorker().postMessage(request);
	});
}

export const engine = new Proxy({} as Async<EngineApi>, {
	get:
		(_target, method: string) =>
		(...args: unknown[]) =>
			call(method as EngineMethod, args)
});

/** Lock and destroy the worker, discarding its entire memory. */
export async function destroyEngine(): Promise<void> {
	if (!worker) return;
	try {
		await call('lock', []);
	} finally {
		worker?.terminate();
		worker = null;
		pending.clear();
	}
}
