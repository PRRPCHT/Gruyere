import { json, redirect } from '@sveltejs/kit';
import type { Handle } from '@sveltejs/kit';
import { isPasswordSet } from '$lib/models/password';
import { validateSession } from '$lib/server/session';

const PUBLIC_PATHS = ['/auth', '/setup'];

export const handle: Handle = async ({ event, resolve }) => {
	const { url } = event;
	const passwordSet = await isPasswordSet();

	if (!passwordSet && url.pathname !== '/setup') {
		redirect(302, '/setup');
	}

	if (passwordSet && url.pathname === '/setup') {
		redirect(302, '/auth');
	}

	const sessionCookie = event.cookies.get('auth_session');
	const isAuthenticated = sessionCookie ? validateSession(sessionCookie) : false;

	if (!isAuthenticated && sessionCookie) {
		event.cookies.delete('auth_session', { path: '/' });
	}

	event.locals.isAuthenticated = isAuthenticated;

	if (!isAuthenticated && !PUBLIC_PATHS.includes(url.pathname)) {
		if (url.pathname.startsWith('/api/')) {
			return json({ success: false, error: 'Unauthorized' }, { status: 401 });
		}
		redirect(302, '/auth');
	}

	return resolve(event);
};
