import type { Actions, ServerLoad } from '@sveltejs/kit';
import { fail, redirect } from '@sveltejs/kit';
import { getPasswordHash, verifyPassword } from '$lib/models/password';
import { createSession, validateSession } from '$lib/server/session';

export const load: ServerLoad = async ({ cookies }) => {
	// Check if user is already authenticated
	const sessionCookie = cookies.get('auth_session');
	let isAuthenticated = false;

	if (sessionCookie) {
		isAuthenticated = validateSession(sessionCookie);
		if (!isAuthenticated) {
			cookies.delete('auth_session', { path: '/' });
		}
	}

	// If already authenticated, redirect to home
	if (isAuthenticated) {
		throw redirect(302, '/');
	}

	return {
		isAuthenticated
	};
};

export const actions: Actions = {
	login: async ({ request, cookies }) => {
		const formData = await request.formData();
		const password = formData.get('password') as string;
		const hash = await getPasswordHash();
		if (!hash || !(await verifyPassword(password, hash))) {
			return fail(401, { error: 'Invalid password' });
		}
		const token = createSession();
		cookies.set('auth_session', token, {
			path: '/',
			expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
			httpOnly: true,
			secure: process.env.NODE_ENV === 'production',
			sameSite: 'strict'
		});
		throw redirect(302, '/');
	}
} satisfies Actions;
