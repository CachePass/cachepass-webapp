import { describe, expect, it } from 'vitest';
import {
	validateAccountPassword,
	validateMasterPassword,
	validateRegistration
} from './validation';

const valid = {
	email: 'alice@example.com',
	accountPassword: 'account password 1',
	accountConfirm: 'account password 1',
	masterPassword: 'a different master passphrase',
	masterConfirm: 'a different master passphrase',
	acknowledged: true
};

describe('registration validation', () => {
	it('accepts a valid form', () => {
		expect(validateRegistration(valid)).toEqual({});
	});

	it('reports each problem', () => {
		const errors = validateRegistration({
			email: 'nope',
			accountPassword: 'short',
			accountConfirm: 'other',
			masterPassword: 'short',
			masterConfirm: 'x',
			acknowledged: false
		});
		expect(Object.keys(errors).sort()).toEqual(
			[
				'acknowledged',
				'accountConfirm',
				'accountPassword',
				'email',
				'masterConfirm',
				'masterPassword'
			].sort()
		);
	});

	it('rejects a master password equal to the account password (incl. Unicode variants)', () => {
		const errors = validateRegistration({
			...valid,
			masterPassword: valid.accountPassword,
			masterConfirm: valid.accountPassword
		});
		expect(errors.masterPassword).toMatch(/different from your account password/);
		expect(validateMasterPassword('Café passphrase!', 'Café passphrase!')).toBeDefined();
	});

	it('bounds lengths', () => {
		expect(validateAccountPassword('x'.repeat(257))).toBeDefined();
		expect(validateMasterPassword('x'.repeat(1025))).toBeDefined();
		expect(validateMasterPassword('twelve chars')).toBeUndefined();
	});
});
