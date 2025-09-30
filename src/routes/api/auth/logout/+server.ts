import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import logger from '$lib/utils/logger';

export const POST: RequestHandler = async ({ cookies }) => {
	logger.info('User logout request received');

	try {
		// Remove session cookie
		cookies.delete('auth_session', { path: '/' });
		logger.info('User logged out successfully');

		return json({ success: true });
	} catch (error) {
		logger.error({ error }, 'Logout error');
		return json({ success: false, error: 'Internal server error' }, { status: 500 });
	}
};
