/** Client-side form validation for authentication flows (the server re-validates everything). */
import { z } from 'zod';

export const ACCOUNT_PASSWORD_MIN = 12;
export const MASTER_PASSWORD_MIN = 12;

const emailSchema = z.email();

export interface RegistrationInput {
	email: string;
	accountPassword: string;
	accountConfirm: string;
	masterPassword: string;
	masterConfirm: string;
	acknowledged: boolean;
}

export type RegistrationErrors = Partial<Record<keyof RegistrationInput, string>>;

export function validateRegistration(input: RegistrationInput): RegistrationErrors {
	const errors: RegistrationErrors = {};
	if (!emailSchema.safeParse(input.email.trim()).success)
		errors.email = 'Enter a valid email address.';
	if ([...input.accountPassword].length < ACCOUNT_PASSWORD_MIN)
		errors.accountPassword = `Use at least ${ACCOUNT_PASSWORD_MIN} characters.`;
	else if ([...input.accountPassword].length > 256)
		errors.accountPassword = 'Use at most 256 characters.';
	if (input.accountConfirm !== input.accountPassword)
		errors.accountConfirm = 'Passwords do not match.';
	errors.masterPassword = validateMasterPassword(input.masterPassword, input.accountPassword);
	if (!errors.masterPassword) delete errors.masterPassword;
	if (input.masterConfirm !== input.masterPassword)
		errors.masterConfirm = 'Master passwords do not match.';
	if (!input.acknowledged) errors.acknowledged = 'Please confirm you understand.';
	return errors;
}

/** Rules for a new master password. Must not equal the account password, which the server sees. */
export function validateMasterPassword(
	master: string,
	accountPassword?: string
): string | undefined {
	const length = [...master.normalize('NFC')].length;
	if (length < MASTER_PASSWORD_MIN) return `Use at least ${MASTER_PASSWORD_MIN} characters.`;
	if (length > 1024) return 'Use at most 1024 characters.';
	if (accountPassword !== undefined && master.normalize('NFC') === accountPassword.normalize('NFC'))
		return 'Must be different from your account password — the server sees the account password, never the master password.';
	return undefined;
}

export function validateAccountPassword(password: string): string | undefined {
	const length = [...password].length;
	if (length < ACCOUNT_PASSWORD_MIN) return `Use at least ${ACCOUNT_PASSWORD_MIN} characters.`;
	if (length > 256) return 'Use at most 256 characters.';
	return undefined;
}
