import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { PiHoleInstanceStatus, type ActionStatus, type PiHoleInstance } from '$lib/types/types';
import { updateGravity } from '$lib/clients/pihole_client';

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
			message: 'Instance not found',
			instanceStatus: PiHoleInstanceStatus.UNREACHABLE
		};
		return json({ success: false, status: actionStatus }, { status: 400 });
	}
	try {
		const updateSuccess = await updateGravity(instance);
		let actionStatus: ActionStatus = {
			success: updateSuccess,
			instance: instance.name,
			message: updateSuccess ? 'Gravities updated successfully' : 'Failed to update gravities',
			instanceStatus: instance.status
		};
		return json({ success: updateSuccess, status: actionStatus });
	} catch (error) {
		console.error('Error updating gravities:', error);
		let actionStatus: ActionStatus = {
			success: false,
			instance: instance.name,
			message: 'Failed to update gravities',
			instanceStatus: instance.status
		};
		return json({ success: false, status: actionStatus });
	}
};
