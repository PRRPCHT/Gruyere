import { pauseDNSBlocking } from '$lib/clients/pihole_client';
import {
	PauseDurationTimeScale,
	PiHoleInstanceStatus,
	type ActionStatus,
	type PiHoleInstance
} from '$lib/types/types';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, cookies }) => {
	// Check authentication
	const sessionCookie = cookies.get('auth_session');
	if (!sessionCookie || Date.now() >= parseInt(sessionCookie)) {
		let actionStatus: ActionStatus = {
			success: false,
			instance: 'Unknown instance',
			message: 'Unauthorized',
			instanceStatus: PiHoleInstanceStatus.UNAUTHORIZED
		};
		return json({ success: false, status: actionStatus }, { status: 401 });
	}
	let {
		duration,
		timeScale,
		instance
	}: { duration: number; timeScale: PauseDurationTimeScale; instance: PiHoleInstance } =
		await request.json();
	if (!duration || duration <= 0 || !timeScale || !instance) {
		let actionStatus: ActionStatus = {
			success: false,
			instance: instance ? instance.name : 'Unknown instance',
			message: 'Failed to pause DNS blocking',
			instanceStatus: instance?.status || PiHoleInstanceStatus.UNREACHABLE
		};
		return json({ success: false, status: actionStatus });
	}
	duration = Math.round(duration);
	let success = true;
	try {
		const pauseSuccess = await pauseDNSBlocking(instance, durationInSeconds(duration, timeScale));
		success = success && pauseSuccess;
		let actionStatus: ActionStatus = {
			success: pauseSuccess,
			instance: instance.name,
			message: pauseSuccess
				? 'DNS blocking paused successfully for ' + duration + ' ' + timeScale
				: 'Failed to pause DNS blocking for ' + duration + ' ' + timeScale,
			instanceStatus: instance.status
		};
		return json({ success, status: actionStatus });
	} catch (error) {
		console.error('Error pausing DNS blocking:', error);
		let actionStatus: ActionStatus = {
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
