import type { Actions, ServerLoad } from '@sveltejs/kit';
import { fail, redirect } from '@sveltejs/kit';
import currentPassword from '../../../password.json';

export const load: ServerLoad = async ({ cookies }) => {
	// Check if user is already authenticated
	const sessionCookie = cookies.get('auth_session');
	let isAuthenticated = false;

	if (sessionCookie) {
		try {
			const expires = parseInt(sessionCookie);
			isAuthenticated = Date.now() < expires;

			if (!isAuthenticated) {
				cookies.delete('auth_session', { path: '/' });
			}
		} catch (error) {
			console.error('Invalid session cookie:', error);
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
		if (password !== currentPassword.password) {
			return fail(401, { error: 'Invalid password' });
		}
		const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
		cookies.set('auth_session', Date.now() + 7 * 24 * 60 * 60 * 1000 + '', {
			path: '/',
			expires,
			httpOnly: true,
			secure: process.env.NODE_ENV === 'production',
			sameSite: 'strict'
		});
		throw redirect(302, '/');
	}
} satisfies Actions;
