import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { PiHoleInstanceStatus, type ActionStatus, type PiHoleInstance } from '$lib/types/types';
import { checkAuthentication, restartDNS } from '$lib/clients/pihole_client';

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
	let { instance }: { instance: PiHoleInstance } = await request.json();
	if (!instance) {
		let actionStatus: ActionStatus = {
			success: false,
			instance: 'Unknown instance',
			message: 'Failed to restart DNS',
			instanceStatus: PiHoleInstanceStatus.UNREACHABLE
		};
		return json({ success: false, status: actionStatus }, { status: 400 });
	}
	await checkAuthentication(instance);
	if (instance.status !== PiHoleInstanceStatus.ACTIVE) {
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
		console.log(actionStatus);
		return json({ success: restartSuccess, status: actionStatus });
	} catch (error) {
		console.error('Error restarting DNS:', error);
		let actionStatus: ActionStatus = {
			success: false,
			instance: instance.name,
			message: 'Failed to restart DNS',
			instanceStatus: instance.status
		};
		return json({ success: false, status: actionStatus });
	}
};
