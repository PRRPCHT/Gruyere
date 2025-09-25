import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ cookies }) => {
	try {
		// Remove session cookie
		cookies.delete('auth_session', { path: '/' });

		return json({ success: true });
	} catch (error) {
		console.error('Logout error:', error);
		return json({ success: false, error: 'Internal server error' }, { status: 500 });
	}
};
