import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('$lib/server/session', () => ({
	deleteSession: vi.fn()
}));

vi.mock('$lib/utils/logger', () => ({
	default: { error: vi.fn(), warn: vi.fn(), info: vi.fn() }
}));

import { POST } from './+server';
import { deleteSession } from '$lib/server/session';

const mockedDeleteSession = vi.mocked(deleteSession);

function makeEvent(sessionCookie?: string) {
	return {
		cookies: {
			get: vi.fn((name: string) => (name === 'auth_session' ? sessionCookie : undefined)),
			delete: vi.fn<[string, { path: string }], void>()
		}
	};
}

describe('POST /api/auth/logout', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('with a valid session cookie', () => {
		const TOKEN = 'abc123def456';

		it('calls deleteSession with the token', async () => {
			const event = makeEvent(TOKEN);

			await POST(event as never);

			expect(mockedDeleteSession).toHaveBeenCalledOnce();
			expect(mockedDeleteSession).toHaveBeenCalledWith(TOKEN);
		});

		it('deletes the auth_session cookie', async () => {
			const event = makeEvent(TOKEN);

			await POST(event as never);

			expect(event.cookies.delete).toHaveBeenCalledWith('auth_session', { path: '/' });
		});

		it('returns JSON success', async () => {
			const event = makeEvent(TOKEN);

			const response = await POST(event as never);
			const body = await response.json();

			expect(response.status).toBe(200);
			expect(body).toMatchObject({ success: true });
		});
	});

	describe('without a session cookie', () => {
		it('does not call deleteSession', async () => {
			const event = makeEvent(undefined);

			await POST(event as never);

			expect(mockedDeleteSession).not.toHaveBeenCalled();
		});

		it('still deletes the auth_session cookie', async () => {
			const event = makeEvent(undefined);

			await POST(event as never);

			expect(event.cookies.delete).toHaveBeenCalledWith('auth_session', { path: '/' });
		});

		it('returns JSON success without crashing', async () => {
			const event = makeEvent(undefined);

			const response = await POST(event as never);
			const body = await response.json();

			expect(response.status).toBe(200);
			expect(body).toMatchObject({ success: true });
		});
	});
});
