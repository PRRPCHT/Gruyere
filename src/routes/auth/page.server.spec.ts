import { describe, it, expect, vi, beforeEach } from 'vitest';

// vi.mock calls are hoisted before imports, so these run first
vi.mock('$lib/models/password', () => ({
	getPasswordHash: vi.fn(),
	verifyPassword: vi.fn()
}));

vi.mock('$lib/server/session', () => ({
	createSession: vi.fn()
}));

vi.mock('$lib/server/login_rate_limiter', () => ({
	getLoginDelay: vi.fn(),
	recordFailedAttempt: vi.fn(),
	resetAttempts: vi.fn()
}));

import { load, actions } from './+page.server';
import { getPasswordHash, verifyPassword } from '$lib/models/password';
import { createSession } from '$lib/server/session';
import { getLoginDelay, recordFailedAttempt, resetAttempts } from '$lib/server/login_rate_limiter';

const mockedGetPasswordHash = vi.mocked(getPasswordHash);
const mockedVerifyPassword = vi.mocked(verifyPassword);
const mockedCreateSession = vi.mocked(createSession);
const mockedGetLoginDelay = vi.mocked(getLoginDelay);
const mockedRecordFailedAttempt = vi.mocked(recordFailedAttempt);
const mockedResetAttempts = vi.mocked(resetAttempts);

const TEST_IP = '127.0.0.1';
const TEST_TOKEN = 'a1b2c3d4'.repeat(8); // 64-char hex token
const TEST_HASH = 'somesalt:somekey';
const CORRECT_PASSWORD = 'correct-horse-battery-staple';

function makeFormData(password: string): FormData {
	const fd = new FormData();
	fd.set('password', password);
	return fd;
}

function makeLoginEvent(password: string, ip = TEST_IP) {
	return {
		request: {
			formData: () => Promise.resolve(makeFormData(password))
		} as unknown as Request,
		cookies: {
			set: vi.fn<[string, string, object], void>()
		},
		getClientAddress: () => ip
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

describe('auth/+page.server', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('load', () => {
		it('redirects to / when already authenticated', async () => {
			const redir = await catchRedirect(() => load({ locals: { isAuthenticated: true } } as never));
			expect(redir).toMatchObject({ status: 302, location: '/' });
		});

		it('returns isAuthenticated: false when not authenticated', async () => {
			const result = await load({ locals: { isAuthenticated: false } } as never);
			expect(result).toEqual({ isAuthenticated: false });
		});
	});

	describe('actions.login', () => {
		describe('rate limiting', () => {
			it('returns 429 when IP is rate-limited', async () => {
				mockedGetLoginDelay.mockReturnValue(5_000);
				const result = await actions.login(makeLoginEvent(CORRECT_PASSWORD) as never);
				expect(result?.status).toBe(429);
			});

			it('does not check the password when rate-limited', async () => {
				mockedGetLoginDelay.mockReturnValue(5_000);
				await actions.login(makeLoginEvent(CORRECT_PASSWORD) as never);
				expect(mockedGetPasswordHash).not.toHaveBeenCalled();
			});
		});

		describe('wrong password', () => {
			beforeEach(() => {
				mockedGetLoginDelay.mockReturnValue(0);
				mockedGetPasswordHash.mockResolvedValue(TEST_HASH);
				mockedVerifyPassword.mockResolvedValue(false);
			});

			it('returns 401 for a wrong password', async () => {
				const result = await actions.login(makeLoginEvent('wrong-password') as never);
				expect(result?.status).toBe(401);
			});

			it('records a failed attempt for the originating IP', async () => {
				await actions.login(makeLoginEvent('wrong-password') as never);
				expect(mockedRecordFailedAttempt).toHaveBeenCalledWith(TEST_IP);
			});
		});

		describe('no password hash on file', () => {
			beforeEach(() => {
				mockedGetLoginDelay.mockReturnValue(0);
				mockedGetPasswordHash.mockResolvedValue(null);
			});

			it('returns 401 when no password file exists', async () => {
				const result = await actions.login(makeLoginEvent(CORRECT_PASSWORD) as never);
				expect(result?.status).toBe(401);
			});

			it('records a failed attempt even when no hash is stored', async () => {
				await actions.login(makeLoginEvent(CORRECT_PASSWORD) as never);
				expect(mockedRecordFailedAttempt).toHaveBeenCalledWith(TEST_IP);
			});
		});

		describe('successful login', () => {
			beforeEach(() => {
				mockedGetLoginDelay.mockReturnValue(0);
				mockedGetPasswordHash.mockResolvedValue(TEST_HASH);
				mockedVerifyPassword.mockResolvedValue(true);
				mockedCreateSession.mockReturnValue(TEST_TOKEN);
			});

			it('redirects to / on success', async () => {
				const redir = await catchRedirect(() =>
					actions.login(makeLoginEvent(CORRECT_PASSWORD) as never)
				);
				expect(redir).toMatchObject({ status: 302, location: '/' });
			});

			it('sets the auth_session cookie with the session token', async () => {
				const event = makeLoginEvent(CORRECT_PASSWORD);
				await catchRedirect(() => actions.login(event as never));
				expect(event.cookies.set).toHaveBeenCalledWith(
					'auth_session',
					TEST_TOKEN,
					expect.objectContaining({ httpOnly: true, path: '/' })
				);
			});

			it('resets the rate-limit counter for the IP', async () => {
				const event = makeLoginEvent(CORRECT_PASSWORD);
				await catchRedirect(() => actions.login(event as never));
				expect(mockedResetAttempts).toHaveBeenCalledWith(TEST_IP);
			});

			it('does not record a failed attempt on success', async () => {
				const event = makeLoginEvent(CORRECT_PASSWORD);
				await catchRedirect(() => actions.login(event as never));
				expect(mockedRecordFailedAttempt).not.toHaveBeenCalled();
			});
		});
	});
});
