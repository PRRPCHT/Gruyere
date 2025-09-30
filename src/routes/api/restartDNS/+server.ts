import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { PiHoleInstanceStatus, type ActionStatus, type PiHoleInstance } from '$lib/types/types';
import { checkAuthentication, restartDNS } from '$lib/clients/pihole_client';
import logger from '$lib/utils/logger';

export const POST: RequestHandler = async ({ request, cookies }) => {
	logger.info('DNS restart request received');

	// Check authentication
	const sessionCookie = cookies.get('auth_session');
	if (!sessionCookie || Date.now() >= parseInt(sessionCookie)) {
		logger.warn('Unauthorized access attempt to restart DNS');
		let actionStatus: ActionStatus = {
			success: false,
			instance: 'Unknown instance',
			message: 'Unauthorized',
			instanceStatus: PiHoleInstanceStatus.UNAUTHORIZED
		};
		return json({ success: false, status: actionStatus }, { status: 401 });
	}

	let { instance }: { instance: PiHoleInstance } = await request.json();
	if (!instance) {
		logger.warn('Invalid restart DNS request - no instance provided');
		let actionStatus: ActionStatus = {
			success: false,
			instance: 'Unknown instance',
			message: 'Failed to restart DNS',
			instanceStatus: PiHoleInstanceStatus.UNREACHABLE
		};
		return json({ success: false, status: actionStatus }, { status: 400 });
	}

	logger.info(`Restarting DNS for instance ${instance.name}`);
	await checkAuthentication(instance);

	if (instance.status !== PiHoleInstanceStatus.ACTIVE) {
		logger.warn(`Instance ${instance.name} is not active, status: ${instance.status}`);
		let actionStatus: ActionStatus = {
			success: false,
			instance: instance.name,
			message: 'Instance is unreachable. Check the instance status and your API key.',
			instanceStatus: instance.status
		};
		return json({ success: false, status: actionStatus }, { status: 400 });
	}

	try {
		const restartSuccess = await restartDNS(instance);
		let actionStatus: ActionStatus = {
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
		let actionStatus: ActionStatus = {
			success: false,
			instance: instance.name,
			message: 'Failed to restart DNS',
			instanceStatus: instance.status
		};
		return json({ success: false, status: actionStatus });
	}
};
