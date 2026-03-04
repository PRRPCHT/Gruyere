import { pauseDNSBlocking } from '$lib/clients/pihole_client';
import {
	PauseDurationTimeScale,
	PiHoleInstanceStatus,
	type ActionStatus,
	type PiHoleInstance
} from '$lib/types/types';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import logger from '$lib/utils/logger';
import { validateSession } from '$lib/server/session';

export const POST: RequestHandler = async ({ request, cookies }) => {
	logger.info('Pause DNS blocking request received');

	// Check authentication
	const sessionCookie = cookies.get('auth_session');
	if (!sessionCookie || !validateSession(sessionCookie)) {
		logger.warn('Unauthorized access attempt to pause DNS blocking');
		const actionStatus: ActionStatus = {
			success: false,
			instance: 'Unknown instance',
			message: 'Unauthorized',
			instanceStatus: PiHoleInstanceStatus.UNAUTHORIZED
		};
		return json({ success: false, status: actionStatus }, { status: 401 });
	}

	const {
		duration: rawDuration,
		timeScale,
		instance
	}: {
		duration: number;
		timeScale: PauseDurationTimeScale;
		instance: PiHoleInstance;
	} = await request.json();

	if (!rawDuration || rawDuration <= 0 || !timeScale || !instance) {
		logger.warn(
			{
				duration: rawDuration,
				timeScale,
				instance: instance?.name
			},
			'Invalid pause DNS blocking request parameters'
		);
		const actionStatus: ActionStatus = {
			success: false,
			instance: instance ? instance.name : 'Unknown instance',
			message: 'Failed to pause DNS blocking',
			instanceStatus: instance?.status || PiHoleInstanceStatus.UNREACHABLE
		};
		return json({ success: false, status: actionStatus });
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
