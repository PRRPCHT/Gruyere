import { getPiHoleInstances } from '$lib/models/pihole_instances';
import type { ServerLoad } from '@sveltejs/kit';

export const load: ServerLoad = async ({ cookies }) => {
	const instances = await getPiHoleInstances();
	return {
		instances: instances
	};
};
