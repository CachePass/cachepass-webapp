/* tslint:disable */
/* eslint-disable */

/**
 * Validated Argon2id parameters + salt. Construction fails for anything
 * outside the accepted bounds, so a malicious server cannot push weak or
 * resource-exhausting parameters.
 */
export class KdfConfig {
    free(): void;
    [Symbol.dispose](): void;
    /**
     * Validate and construct.
     */
    constructor(memory_kib: number, iterations: number, parallelism: number, salt: Uint8Array | number[]);
}

/**
 * Opaque handle to an unlocked vault key held in WASM memory.
 */
export class VaultKeyHandle {
    private constructor();
    free(): void;
    [Symbol.dispose](): void;
    /**
     * Decrypt a folder envelope.
     */
    decryptFolder(vault_id: Uint8Array | number[], folder_id: Uint8Array | number[], envelope: Uint8Array | number[]): Uint8Array;
    /**
     * Decrypt an item envelope.
     */
    decryptItem(vault_id: Uint8Array | number[], item_id: Uint8Array | number[], envelope: Uint8Array | number[]): Uint8Array;
    /**
     * Encrypt a folder payload. `plaintext` is zeroized after use.
     */
    encryptFolder(vault_id: Uint8Array | number[], folder_id: Uint8Array | number[], plaintext: Uint8Array | number[]): Uint8Array;
    /**
     * Encrypt an item payload. `plaintext` is zeroized after use.
     */
    encryptItem(vault_id: Uint8Array | number[], item_id: Uint8Array | number[], plaintext: Uint8Array | number[]): Uint8Array;
    /**
     * Wrap this vault key under a KEK derived from `password` (used at
     * registration and on master password change).
     */
    wrap(password: Uint8Array | number[], vault_id: Uint8Array | number[], kdf: KdfConfig): Uint8Array;
}

/**
 * Fresh random 16-byte KDF salt.
 */
export function generateSalt(): Uint8Array;

/**
 * Generate a new random vault key.
 */
export function generateVaultKey(): VaultKeyHandle;

/**
 * KDF policy as `[default_m, min_m, max_m, default_t, min_t, max_t, default_p, min_p, max_p]`.
 */
export function kdfPolicy(): Uint32Array;

/**
 * Derive the KEK from the master password and unwrap the vault key.
 */
export function unlockVaultKey(password: Uint8Array | number[], vault_id: Uint8Array | number[], kdf: KdfConfig, wrapped_key: Uint8Array | number[]): VaultKeyHandle;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
    readonly memory: WebAssembly.Memory;
    readonly __wbg_kdfconfig_free: (a: number, b: number) => void;
    readonly __wbg_vaultkeyhandle_free: (a: number, b: number) => void;
    readonly generateSalt: () => [number, number, number, number];
    readonly generateVaultKey: () => [number, number, number];
    readonly kdfPolicy: () => [number, number];
    readonly kdfconfig_new: (a: number, b: number, c: number, d: number, e: number) => [number, number, number];
    readonly unlockVaultKey: (a: number, b: number, c: number, d: number, e: number, f: number, g: number) => [number, number, number];
    readonly vaultkeyhandle_decryptFolder: (a: number, b: number, c: number, d: number, e: number, f: number, g: number) => [number, number, number];
    readonly vaultkeyhandle_decryptItem: (a: number, b: number, c: number, d: number, e: number, f: number, g: number) => [number, number, number];
    readonly vaultkeyhandle_encryptFolder: (a: number, b: number, c: number, d: number, e: number, f: number, g: number) => [number, number, number, number];
    readonly vaultkeyhandle_encryptItem: (a: number, b: number, c: number, d: number, e: number, f: number, g: number) => [number, number, number, number];
    readonly vaultkeyhandle_wrap: (a: number, b: number, c: number, d: number, e: number, f: number) => [number, number, number, number];
    readonly __wbindgen_exn_store: (a: number) => void;
    readonly __externref_table_alloc: () => number;
    readonly __wbindgen_externrefs: WebAssembly.Table;
    readonly __externref_table_dealloc: (a: number) => void;
    readonly __wbindgen_free: (a: number, b: number, c: number) => void;
    readonly __wbindgen_malloc: (a: number, b: number) => number;
    readonly __wbindgen_start: () => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;

/**
 * Instantiates the given `module`, which can either be bytes or
 * a precompiled `WebAssembly.Module`.
 *
 * @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
 *
 * @returns {InitOutput}
 */
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
 * If `module_or_path` is {RequestInfo} or {URL}, makes a request and
 * for everything else, calls `WebAssembly.instantiate` directly.
 *
 * @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
 *
 * @returns {Promise<InitOutput>}
 */
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;
