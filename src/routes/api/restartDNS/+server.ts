import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { PiHoleInstanceStatus, type ActionStatus } from '$lib/types/types';
import { checkAuthentication, restartDNS } from '$lib/clients/pihole_client';
import logger from '$lib/utils/logger';
import { getPiHoleInstances } from '$lib/models/pihole_instances';

export const POST: RequestHandler = async ({ request }) => {
	logger.info('DNS restart request received');

	const { instanceId }: { instanceId: number } = await request.json();
	if (!instanceId) {
		logger.warn('Invalid restart DNS request - no instanceId provided');
		const actionStatus: ActionStatus = {
			success: false,
			instance: 'Unknown instance',
			message: 'Failed to restart DNS',
			instanceStatus: PiHoleInstanceStatus.UNREACHABLE
		};
		return json({ success: false, status: actionStatus }, { status: 400 });
	}

	const instances = await getPiHoleInstances();
	const instance = instances.find((i) => i.id === instanceId);
	if (!instance) {
		logger.warn({ instanceId }, 'Instance not found for restart DNS');
		const actionStatus: ActionStatus = {
			success: false,
			instance: 'Unknown instance',
			message: 'Instance not found',
			instanceStatus: PiHoleInstanceStatus.UNREACHABLE
		};
		return json({ success: false, status: actionStatus }, { status: 404 });
	}

	logger.info(`Restarting DNS for instance ${instance.name}`);
	await checkAuthentication(instance);

	if (instance.status !== PiHoleInstanceStatus.ACTIVE) {
		logger.warn(`Instance ${instance.name} is not active, status: ${instance.status}`);
		const actionStatus: ActionStatus = {
			success: false,
			instance: instance.name,
			message: 'Instance is unreachable. Check the instance status and your API key.',
			instanceStatus: instance.status
		};
		return json({ success: false, status: actionStatus }, { status: 400 });
	}

	try {
		const restartSuccess = await restartDNS(instance);
		const actionStatus: ActionStatus = {
			success: restartSuccess,
			instance: instance.name,
			message: restartSuccess ? 'DNS restarted successfully' : 'Failed to restart DNS',
			instanceStatus: instance.status
		};

		if (restartSuccess) {
			logger.info(`Successfully restarted DNS for ${instance.name}`);
		} else {
			logger.warn(`Failed to restart DNS for ${instance.name}`);
		}

		return json({ success: restartSuccess, status: actionStatus });
	} catch (error) {
		logger.error({ error, instance: instance.name }, 'Error restarting DNS');
		const actionStatus: ActionStatus = {
			success: false,
			instance: instance.name,
			message: 'Failed to restart DNS',
			instanceStatus: instance.status
		};
		return json({ success: false, status: actionStatus });
	}
};
