import { getPiHoleInstances } from '$lib/models/pihole_instances';
import { toClientInstances } from '$lib/types/types';
import type { ServerLoad } from '@sveltejs/kit';

export const load: ServerLoad = async () => {
	const instances = await getPiHoleInstances();
	return {
		instances: toClientInstances(instances)
	};
};
