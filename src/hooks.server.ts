import { redirect } from '@sveltejs/kit';
import type { Handle } from '@sveltejs/kit';
import { isPasswordSet } from '$lib/models/password';

export const handle: Handle = async ({ event, resolve }) => {
	const { url } = event;
	const passwordSet = await isPasswordSet();

	if (!passwordSet && url.pathname !== '/setup') {
		redirect(302, '/setup');
	}

	if (passwordSet && url.pathname === '/setup') {
		redirect(302, '/auth');
	}

	return resolve(event);
};
