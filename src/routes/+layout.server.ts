import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async () => {
	// Initialize the PiHole manager on app startup
	// try {
	// 	await piholeManager.initialize();
	// 	console.log('PiHole manager initialized successfully');
	// } catch (error) {
	// 	console.error('Failed to initialize PiHole manager:', error);
	// }
	// return {
	// 	// We don't need to return anything specific here since the singleton
	// 	// will be accessible from both frontend and backend
	// };
};
