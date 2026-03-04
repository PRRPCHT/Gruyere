import { resumeDNSBlocking } from '$lib/clients/pihole_client';
import { PiHoleInstanceStatus, type ActionStatus } from '$lib/types/types';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import logger from '$lib/utils/logger';
import { validateSession } from '$lib/server/session';
import { getPiHoleInstances } from '$lib/models/pihole_instances';

export const POST: RequestHandler = async ({ request, cookies }) => {
	logger.info('Resume DNS blocking request received');

	// Check authentication
	const sessionCookie = cookies.get('auth_session');
	if (!sessionCookie || !validateSession(sessionCookie)) {
		logger.warn('Unauthorized access attempt to resume DNS blocking');
		return json({ success: false, error: 'Unauthorized' }, { status: 401 });
	}

	const { instanceId }: { instanceId: number } = await request.json();
	if (!instanceId) {
		logger.warn('Invalid resume DNS blocking request - no instanceId provided');
		const actionStatus: ActionStatus = {
			success: false,
			instance: 'Unknown instance',
			message: 'Failed to resume DNS blocking',
			instanceStatus: PiHoleInstanceStatus.UNREACHABLE
		};
		return json({ success: false, status: actionStatus });
	}

	const instances = await getPiHoleInstances();
	const instance = instances.find((i) => i.id === instanceId);
	if (!instance) {
		logger.warn({ instanceId }, 'Instance not found for resume DNS blocking');
		const actionStatus: ActionStatus = {
			success: false,
			instance: 'Unknown instance',
			message: 'Instance not found',
			instanceStatus: PiHoleInstanceStatus.UNREACHABLE
		};
		return json({ success: false, status: actionStatus }, { status: 404 });
	}

	logger.info(`Resuming DNS blocking for instance ${instance.name}`);

	let success = true;
	try {
		const resumeSuccess = await resumeDNSBlocking(instance);
		success = success && resumeSuccess;
		const actionStatus: ActionStatus = {
			success: resumeSuccess,
			instance: instance.name,
			message: resumeSuccess
				? 'DNS blocking resumed successfully'
				: 'Failed to resume DNS blocking',
			instanceStatus: instance.status
		};

		if (resumeSuccess) {
			logger.info(`Successfully resumed DNS blocking for ${instance.name}`);
		} else {
			logger.warn(`Failed to resume DNS blocking for ${instance.name}`);
		}

		return json({ success, status: actionStatus });
	} catch (error) {
		logger.error({ error, instance: instance.name }, 'Error resuming DNS blocking');
		const actionStatus: ActionStatus = {
			success: false,
			instance: instance.name,
			message: 'Failed to resume DNS blocking',
			instanceStatus: instance.status
		};
		return json({ success: false, status: actionStatus });
	}
};
