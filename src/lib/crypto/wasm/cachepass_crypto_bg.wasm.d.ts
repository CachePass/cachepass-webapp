/* tslint:disable */
/* eslint-disable */
export const memory: WebAssembly.Memory;
export const __wbg_kdfconfig_free: (a: number, b: number) => void;
export const __wbg_vaultkeyhandle_free: (a: number, b: number) => void;
export const generateSalt: () => [number, number, number, number];
export const generateVaultKey: () => [number, number, number];
export const kdfPolicy: () => [number, number];
export const kdfconfig_new: (a: number, b: number, c: number, d: number, e: number) => [number, number, number];
export const unlockVaultKey: (a: number, b: number, c: number, d: number, e: number, f: number, g: number) => [number, number, number];
export const vaultkeyhandle_decryptFolder: (a: number, b: number, c: number, d: number, e: number, f: number, g: number) => [number, number, number];
export const vaultkeyhandle_decryptItem: (a: number, b: number, c: number, d: number, e: number, f: number, g: number) => [number, number, number];
export const vaultkeyhandle_encryptFolder: (a: number, b: number, c: number, d: number, e: number, f: number, g: number) => [number, number, number, number];
export const vaultkeyhandle_encryptItem: (a: number, b: number, c: number, d: number, e: number, f: number, g: number) => [number, number, number, number];
export const vaultkeyhandle_wrap: (a: number, b: number, c: number, d: number, e: number, f: number) => [number, number, number, number];
export const __wbindgen_exn_store: (a: number) => void;
export const __externref_table_alloc: () => number;
export const __wbindgen_externrefs: WebAssembly.Table;
export const __externref_table_dealloc: (a: number) => void;
export const __wbindgen_free: (a: number, b: number, c: number) => void;
export const __wbindgen_malloc: (a: number, b: number) => number;
export const __wbindgen_start: () => void;
