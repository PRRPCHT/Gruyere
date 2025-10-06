import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { getPiHoleInstances } from '$lib/models/pihole_instances';
import { getStats } from '$lib/clients/pihole_client';

export const GET: RequestHandler = async ({ request, url, cookies }) => {
	const sessionCookie = cookies.get('auth_session');
	if (!sessionCookie || Date.now() >= parseInt(sessionCookie)) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const instanceId = url.searchParams.get('instance');
	if (!instanceId) {
		return json({ error: 'Instance ID is required' }, { status: 400 });
	}

	const instances = await getPiHoleInstances();
	const instance = instances.find((instance) => instance.id === parseInt(instanceId));
	if (!instance) {
		return json({ error: 'Instance not found' }, { status: 404 });
	}

	const stats = await getStats(instance);
	return json({ stats, instanceStatus: instance.status });
};
