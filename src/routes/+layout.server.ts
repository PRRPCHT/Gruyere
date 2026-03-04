import type { LayoutServerLoad } from './$types';
import { validateSession } from '$lib/server/session';

export const load: LayoutServerLoad = async ({ cookies, url }) => {
	// Check for authentication session
	const sessionCookie = cookies.get('auth_session');
	let isAuthenticated = false;

	if (sessionCookie) {
		isAuthenticated = validateSession(sessionCookie);
		if (!isAuthenticated) {
			cookies.delete('auth_session', { path: '/' });
		}
	}

	// Initialize the PiHole manager on app startup
	// try {
	// 	await piholeManager.initialize();
	// 	console.log('PiHole manager initialized successfully');
	// } catch (error) {
	// 	console.error('Failed to initialize PiHole manager:', error);
	// }

	return {
		isAuthenticated,
		// Pass the current pathname to help with client-side routing
		pathname: url.pathname
	};
};
