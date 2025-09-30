import { resumeDNSBlocking } from '$lib/clients/pihole_client';
import { PiHoleInstanceStatus, type ActionStatus, type PiHoleInstance } from '$lib/types/types';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import logger from '$lib/utils/logger';

export const POST: RequestHandler = async ({ request, cookies }) => {
	logger.info('Resume DNS blocking request received');

	// Check authentication
	const sessionCookie = cookies.get('auth_session');
	if (!sessionCookie || Date.now() >= parseInt(sessionCookie)) {
		logger.warn('Unauthorized access attempt to resume DNS blocking');
		return json({ success: false, error: 'Unauthorized' }, { status: 401 });
	}

	let { instance }: { instance: PiHoleInstance } = await request.json();
	if (!instance) {
		logger.warn('Invalid resume DNS blocking request - no instance provided');
		let actionStatus: ActionStatus = {
			success: false,
			instance: 'Unknown instance',
			message: 'Failed to resume DNS blocking',
			instanceStatus: PiHoleInstanceStatus.UNREACHABLE
		};
		return json({ success: false, status: actionStatus });
	}

	logger.info(`Resuming DNS blocking for instance ${instance.name}`);

	let success = true;
	try {
		const resumeSuccess = await resumeDNSBlocking(instance);
		success = success && resumeSuccess;
		let actionStatus: ActionStatus = {
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
		let actionStatus: ActionStatus = {
			success: false,
			instance: instance.name,
			message: 'Failed to resume DNS blocking',
			instanceStatus: instance.status
		};
		return json({ success: false, status: actionStatus });
	}
};
