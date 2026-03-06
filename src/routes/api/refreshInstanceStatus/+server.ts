import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getPiHoleInstances, savePiHoleInstances } from '$lib/models/pihole_instances';
import { checkAuthentication } from '$lib/clients/pihole_client';
import { toClientInstance } from '$lib/types/types';
import logger from '$lib/utils/logger';
export const GET: RequestHandler = async ({ url }) => {
	logger.info('Refreshing instance status');

	const instanceId = url.searchParams.get('id');
	if (!instanceId) {
		logger.warn('Instance ID is required');
		return json({ success: false, error: 'Instance ID is required' }, { status: 400 });
	}

	const instances = await getPiHoleInstances();
	logger.debug(`Found ${instances.length} instances to check`);

	const instance = instances.find((instance) => instance.id === parseInt(instanceId));
	if (!instance) {
		logger.warn('Instance not found');
		return json({ success: false, error: 'Instance not found' }, { status: 404 });
	}

	// Snapshot before mutation so the before/after comparison is meaningful
	const instancesString = JSON.stringify(instances);
	const status = await checkAuthentication(instance);
	instance.status = status;
	const newInstances = instances.map((instance) =>
		instance.id === parseInt(instanceId) ? { ...instance, status } : instance
	);
	const newInstancesString = JSON.stringify(newInstances);
	if (instancesString !== newInstancesString) {
		logger.info('Instance status changed, saving updates');
		await savePiHoleInstances(newInstances);
	} else {
		logger.debug('No changes in instance status');
	}

	logger.info('Successfully refreshed instance status');
	return json({ success: true, instance: toClientInstance(instance) });
};
