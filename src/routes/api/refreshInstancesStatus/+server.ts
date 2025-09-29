import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getPiHoleInstances, savePiHoleInstances } from '$lib/models/pihole_instances';
import { checkAuthentication } from '$lib/clients/pihole_client';

export const GET: RequestHandler = async ({ url, cookies }) => {
	const sessionCookie = cookies.get('auth_session');
	if (!sessionCookie || Date.now() >= parseInt(sessionCookie)) {
		return json({ success: false, error: 'Unauthorized' }, { status: 401 });
	}
	const instances = await getPiHoleInstances();
	await Promise.all(
		instances.map(async (instance) => {
			const status = await checkAuthentication(instance);
			instance.status = status;
		})
	);
	await savePiHoleInstances(instances);
	return json({ success: true, instances: instances });
};
