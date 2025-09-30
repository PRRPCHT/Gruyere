import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getPiHoleInstances, savePiHoleInstances } from '$lib/models/pihole_instances';
import { checkAuthentication } from '$lib/clients/pihole_client';
import logger from '$lib/utils/logger';

export const GET: RequestHandler = async ({ request, url, cookies }) => {
	logger.info('Refreshing instances status');

	const sessionCookie = cookies.get('auth_session');
	if (!sessionCookie || Date.now() >= parseInt(sessionCookie)) {
		logger.warn('Unauthorized access attempt to refresh instances status');
		return json({ success: false, error: 'Unauthorized' }, { status: 401 });
	}

	const instances = await getPiHoleInstances();
	logger.debug(`Found ${instances.length} instances to check`);

	const newInstances = [...instances];
	await Promise.all(
		newInstances.map(async (instance) => {
			const status = await checkAuthentication(instance);
			newInstances.find((newInstance) => newInstance.id === instance.id)!.status = status;
			logger.debug(`Instance ${instance.name} status: ${status}`);
		})
	);

	// Only save if instances and newInstances are not identical
	const instancesString = JSON.stringify(instances);
	const newInstancesString = JSON.stringify(newInstances);
	if (instancesString !== newInstancesString) {
		logger.info('Instance statuses changed, saving updates');
		await savePiHoleInstances(newInstances);
	} else {
		logger.debug('No changes in instance statuses');
	}

	logger.info('Successfully refreshed instances status');
	return json({ success: true, instances: newInstances });
};
