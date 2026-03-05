import { pauseDNSBlocking } from '$lib/clients/pihole_client';
import { PauseDurationTimeScale, PiHoleInstanceStatus, type ActionStatus } from '$lib/types/types';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import logger from '$lib/utils/logger';
import { getPiHoleInstances } from '$lib/models/pihole_instances';

export const POST: RequestHandler = async ({ request }) => {
	logger.info('Pause DNS blocking request received');

	let rawDuration: number;
	let timeScale: PauseDurationTimeScale;
	let instanceId: number;
	try {
		({ duration: rawDuration, timeScale, instanceId } = await request.json());
	} catch {
		const actionStatus: ActionStatus = {
			success: false,
			instance: 'Unknown instance',
			message: 'Invalid request body',
			instanceStatus: PiHoleInstanceStatus.UNREACHABLE
		};
		return json({ success: false, status: actionStatus }, { status: 400 });
	}

	if (!rawDuration || rawDuration <= 0 || !timeScale || !instanceId) {
		logger.warn(
			{ duration: rawDuration, timeScale, instanceId },
			'Invalid pause DNS blocking request parameters'
		);
		const actionStatus: ActionStatus = {
			success: false,
			instance: 'Unknown instance',
			message: 'Failed to pause DNS blocking',
			instanceStatus: PiHoleInstanceStatus.UNREACHABLE
		};
		return json({ success: false, status: actionStatus }, { status: 400 });
	}

	const instances = await getPiHoleInstances();
	const instance = instances.find((i) => i.id === instanceId);
	if (!instance) {
		logger.warn({ instanceId }, 'Instance not found for pause DNS blocking');
		const actionStatus: ActionStatus = {
			success: false,
			instance: 'Unknown instance',
			message: 'Instance not found',
			instanceStatus: PiHoleInstanceStatus.UNREACHABLE
		};
		return json({ success: false, status: actionStatus }, { status: 404 });
	}

	const duration = Math.round(rawDuration);
	logger.info(`Pausing DNS blocking for instance ${instance.name} for ${duration} ${timeScale}`);

	let success = true;
	try {
		const pauseSuccess = await pauseDNSBlocking(instance, durationInSeconds(duration, timeScale));
		success = success && pauseSuccess;
		const actionStatus: ActionStatus = {
			success: pauseSuccess,
			instance: instance.name,
			message: pauseSuccess
				? 'DNS blocking paused successfully for ' + duration + ' ' + timeScale
				: 'Failed to pause DNS blocking for ' + duration + ' ' + timeScale,
			instanceStatus: instance.status
		};

		if (pauseSuccess) {
			logger.info(`Successfully paused DNS blocking for ${instance.name}`);
		} else {
			logger.warn(`Failed to pause DNS blocking for ${instance.name}`);
		}

		return json({ success, status: actionStatus });
	} catch (error) {
		logger.error({ error, instance: instance.name }, 'Error pausing DNS blocking');
		const actionStatus: ActionStatus = {
			success: false,
			instance: instance.name,
			message: 'Failed to pause DNS blocking',
			instanceStatus: instance.status
		};
		return json({ success: false, status: actionStatus });
	}
};

function durationInSeconds(duration: number, timeScale: PauseDurationTimeScale) {
	switch (timeScale) {
		case PauseDurationTimeScale.SECONDS:
			return duration;
		case PauseDurationTimeScale.MINUTES:
			return duration * 60;
		case PauseDurationTimeScale.HOURS:
			return duration * 60 * 60;
		case PauseDurationTimeScale.DAYS:
			return duration * 60 * 60 * 24;
	}
	return duration;
}
