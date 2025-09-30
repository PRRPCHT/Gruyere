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
	const newInstances = [...instances];
	await Promise.all(
		newInstances.map(async (instance) => {
			const status = await checkAuthentication(instance);
			newInstances.find((newInstance) => newInstance.id === instance.id)!.status = status;
		})
	);
	// Only save if instances and newInstances are not identical
	const instancesString = JSON.stringify(instances);
	const newInstancesString = JSON.stringify(newInstances);
	if (instancesString !== newInstancesString) {
		await savePiHoleInstances(newInstances);
	}
	return json({ success: true, instances: newInstances });
};
