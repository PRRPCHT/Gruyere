import { describe, it, expect, vi, beforeEach } from 'vitest';

// vi.mock calls are hoisted before imports, so these run first
vi.mock('$lib/models/password', () => ({
	isPasswordSet: vi.fn()
}));

vi.mock('$lib/server/session', () => ({
	validateSession: vi.fn()
}));

import { handle } from './hooks.server';
import { isPasswordSet } from '$lib/models/password';
import { validateSession } from '$lib/server/session';

const mockedIsPasswordSet = vi.mocked(isPasswordSet);
const mockedValidateSession = vi.mocked(validateSession);

// Minimal RequestEvent mock with just what handle() touches
function makeEvent(pathname: string, sessionCookie?: string) {
	return {
		url: new URL(`http://localhost${pathname}`),
		cookies: {
			get: vi.fn((name: string) => (name === 'auth_session' ? sessionCookie : undefined)),
			delete: vi.fn<[string, { path: string }], void>()
		},
		locals: {} as Record<string, unknown>
	};
}

type MockEvent = ReturnType<typeof makeEvent>;

function makeResolve() {
	return vi.fn().mockResolvedValue(new Response('ok', { status: 200 }));
}

// SvelteKit's redirect() throws rather than returning, so we need to catch it.
// The thrown value has `status` and `location` properties.
async function catchRedirect(
	fn: () => Promise<Response>
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

function callHandle(event: MockEvent, resolve = makeResolve()): Promise<Response> {
	return handle({
		event: event as unknown as Parameters<typeof handle>[0]['event'],
		resolve
	});
}

describe('hooks.server handle', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('no password set', () => {
		beforeEach(() => {
			mockedIsPasswordSet.mockResolvedValue(false);
		});

		it('redirects protected routes to /setup', async () => {
			const redir = await catchRedirect(() => callHandle(makeEvent('/')));
			expect(redir).toMatchObject({ status: 302, location: '/setup' });
		});

		it('redirects /auth to /setup', async () => {
			const redir = await catchRedirect(() => callHandle(makeEvent('/auth')));
			expect(redir).toMatchObject({ status: 302, location: '/setup' });
		});

		it('allows /setup through and calls resolve', async () => {
			const resolve = makeResolve();
			const response = await callHandle(makeEvent('/setup'), resolve);
			expect(response.status).toBe(200);
			expect(resolve).toHaveBeenCalledOnce();
		});
	});

	describe('password set', () => {
		beforeEach(() => {
			mockedIsPasswordSet.mockResolvedValue(true);
		});

		it('redirects /setup to /auth', async () => {
			const redir = await catchRedirect(() => callHandle(makeEvent('/setup')));
			expect(redir).toMatchObject({ status: 302, location: '/auth' });
		});

		describe('unauthenticated — no cookie', () => {
			it('redirects protected page to /auth', async () => {
				const redir = await catchRedirect(() => callHandle(makeEvent('/')));
				expect(redir).toMatchObject({ status: 302, location: '/auth' });
			});

			it('returns 401 JSON for /api/* requests', async () => {
				const response = await callHandle(makeEvent('/api/getStats'));
				expect(response.status).toBe(401);
				const body = await response.json();
				expect(body).toMatchObject({ success: false });
			});

			it('allows /auth without a session', async () => {
				const resolve = makeResolve();
				const response = await callHandle(makeEvent('/auth'), resolve);
				expect(response.status).toBe(200);
				expect(resolve).toHaveBeenCalledOnce();
			});
		});

		describe('unauthenticated — expired cookie', () => {
			const STALE_TOKEN = 'stale-token-xyz';

			beforeEach(() => {
				mockedValidateSession.mockReturnValue(false);
			});

			it('deletes the stale auth_session cookie', async () => {
				const event = makeEvent('/', STALE_TOKEN);
				await catchRedirect(() => callHandle(event));
				expect(event.cookies.delete).toHaveBeenCalledWith('auth_session', { path: '/' });
			});

			it('redirects to /auth after deleting the stale cookie', async () => {
				const redir = await catchRedirect(() => callHandle(makeEvent('/', STALE_TOKEN)));
				expect(redir).toMatchObject({ status: 302, location: '/auth' });
			});
		});

		describe('authenticated', () => {
			const VALID_TOKEN = 'valid-token-abc123';

			beforeEach(() => {
				mockedValidateSession.mockReturnValue(true);
			});

			it('calls resolve for protected pages', async () => {
				const resolve = makeResolve();
				const response = await callHandle(makeEvent('/', VALID_TOKEN), resolve);
				expect(response.status).toBe(200);
				expect(resolve).toHaveBeenCalledOnce();
			});

			it('sets event.locals.isAuthenticated to true', async () => {
				const event = makeEvent('/', VALID_TOKEN);
				await callHandle(event);
				expect(event.locals.isAuthenticated).toBe(true);
			});

			it('does not delete the cookie for a valid session', async () => {
				const event = makeEvent('/', VALID_TOKEN);
				await callHandle(event);
				expect(event.cookies.delete).not.toHaveBeenCalled();
			});
		});
	});
});
