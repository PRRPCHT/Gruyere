import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals, url }) => {
	return {
		isAuthenticated: locals.isAuthenticated,
		pathname: url.pathname
	};
};
