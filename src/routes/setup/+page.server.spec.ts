import { describe, it, expect, vi, beforeEach } from 'vitest';

// vi.mock calls are hoisted before imports, so these run first
vi.mock('$lib/models/password', () => ({
	savePassword: vi.fn()
}));

import { actions } from './+page.server';
import { savePassword } from '$lib/models/password';

const mockedSavePassword = vi.mocked(savePassword);

function makeFormData(password: string, confirm: string): FormData {
	const fd = new FormData();
	fd.set('password', password);
	fd.set('confirm', confirm);
	return fd;
}

function makeEvent(password: string, confirm: string) {
	return {
		request: {
			formData: () => Promise.resolve(makeFormData(password, confirm))
		} as unknown as Request
	};
}

// SvelteKit's redirect() throws rather than returning.
// The thrown value has `status` and `location` properties.
async function catchRedirect(
	fn: () => Promise<unknown>
): Promise<{ status: number; location: string } | null> {
	try {
		await fn();
		return null;
	} catch (e: unknown) {
		if (e && typeof e === 'object' && 'location' in e && 'status' in e) {
			return e as { status: number; location: string };
		}
		throw e;
	}
}

describe('setup/+page.server', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('actions.default', () => {
		describe('password validation', () => {
			it('returns 400 when password is shorter than 8 characters', async () => {
				const result = await actions.default(makeEvent('short', 'short') as never);
				expect(result?.status).toBe(400);
			});

			it('returns 400 when password is empty', async () => {
				const result = await actions.default(makeEvent('', '') as never);
				expect(result?.status).toBe(400);
			});

			it('returns 400 when password and confirmation do not match', async () => {
				const result = await actions.default(
					makeEvent('long-enough-password', 'different-password') as never
				);
				expect(result?.status).toBe(400);
			});

			it('does not call savePassword when validation fails', async () => {
				await actions.default(makeEvent('short', 'short') as never);
				expect(mockedSavePassword).not.toHaveBeenCalled();
			});
		});

		describe('save failure', () => {
			it('returns 500 when savePassword fails', async () => {
				mockedSavePassword.mockResolvedValue(false);
				const result = await actions.default(makeEvent('validpassword', 'validpassword') as never);
				expect(result?.status).toBe(500);
			});
		});

		describe('successful setup', () => {
			beforeEach(() => {
				mockedSavePassword.mockResolvedValue(true);
			});

			it('redirects to /auth on success', async () => {
				const redir = await catchRedirect(() =>
					actions.default(makeEvent('validpassword', 'validpassword') as never)
				);
				expect(redir).toMatchObject({ status: 302, location: '/auth' });
			});

			it('calls savePassword with the submitted password', async () => {
				await catchRedirect(() =>
					actions.default(makeEvent('validpassword', 'validpassword') as never)
				);
				expect(mockedSavePassword).toHaveBeenCalledWith('validpassword');
			});

			it('accepts a password of exactly 8 characters', async () => {
				const redir = await catchRedirect(() =>
					actions.default(makeEvent('exactly8', 'exactly8') as never)
				);
				expect(redir).toMatchObject({ status: 302, location: '/auth' });
			});
		});
	});
});
