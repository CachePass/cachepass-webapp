/** Test vectors from docs/CRYPTOGRAPHY.md §9.1. Test use only. */
export const VECTORS = {
	vaultId: '0f1e2d3c-4b5a-6978-8796-a5b4c3d2e1f0',
	itemId: '11111111-2222-4333-8444-555555555555',
	password: 'correct horse battery staple',
	salt: '000102030405060708090a0b0c0d0e0f',
	kdf: { memory_kib: 19456, iterations: 2, parallelism: 1 },
	dek: '202122232425262728292a2b2c2d2e2f303132333435363738393a3b3c3d3e3f',
	nonceWrap: '404142434445464748494a4b4c4d4e4f5051525354555657',
	nonceItem: '606162636465666768696a6b6c6d6e6f7071727374757677',
	itemJson: '{"schema":1,"type":"note","name":"Test"}',
	ikm: '818259b6310026a8e0dbac5d2e6927abcfdb07b32258fac4f61b18b80f929085',
	kek: 'a552e869c0e7842897ba0b8c0dbb118ef465a2ca81475c8c3cda02bcad121902',
	wrapped:
		'0101404142434445464748494a4b4c4d4e4f5051525354555657766b9b6de612c45b9b386b77f75a2c279cde4e71d3de75dc8539aa7d05b7ed72a49df5ff889f4db69f8362e9338e4ac2',
	item: '0101606162636465666768696a6b6c6d6e6f707172737475767793053345ed14f6a0883ba42330d556e912ce9637078aad03420e1b945bf8e7a519b3297452c4065fc6b8276ec7b40652d6ee092f5dd26df31e40e8a56bde809019e7bbe60e1d1cce6cb0439c8dbe60cf'
} as const;

export function hex(value: string): Uint8Array {
	return new Uint8Array(value.match(/../g)!.map((b) => parseInt(b, 16)));
}

export function toHex(bytes: Uint8Array): string {
	return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}
