import type { Actions, ServerLoad } from '@sveltejs/kit';
import { fail, redirect } from '@sveltejs/kit';
import { getPasswordHash, verifyPassword } from '$lib/models/password';
import { createSession } from '$lib/server/session';

export const load: ServerLoad = async ({ locals }) => {
	if (locals.isAuthenticated) {
		throw redirect(302, '/');
	}

	return {
		isAuthenticated: false
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
