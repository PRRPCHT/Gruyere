import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import logger from '$lib/utils/logger';
import { deleteSession } from '$lib/server/session';

export const POST: RequestHandler = async ({ cookies }) => {
	logger.info('User logout request received');

	try {
		const sessionCookie = cookies.get('auth_session');
		if (sessionCookie) deleteSession(sessionCookie);
		cookies.delete('auth_session', { path: '/' });
		logger.info('User logged out successfully');

		return json({ success: true });
	} catch (error) {
		logger.error({ error }, 'Logout error');
		return json({ success: false, error: 'Internal server error' }, { status: 500 });
	}
};
