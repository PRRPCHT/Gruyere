import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { PiHoleInstanceStatus, type ActionStatus } from '$lib/types/types';
import { updateGravity } from '$lib/clients/pihole_client';
import logger from '$lib/utils/logger';
import { getPiHoleInstances } from '$lib/models/pihole_instances';

export const POST: RequestHandler = async ({ request }) => {
	let instanceId: number;
	try {
		({ instanceId } = await request.json());
	} catch {
		return json(
			{
				success: false,
				status: {
					success: false,
					instance: 'Unknown instance',
					message: 'Invalid request body',
					instanceStatus: PiHoleInstanceStatus.UNREACHABLE
				}
			},
			{ status: 400 }
		);
	}
	if (!instanceId) {
		const actionStatus: ActionStatus = {
			success: false,
			instance: 'Unknown instance',
			message: 'Instance ID required',
			instanceStatus: PiHoleInstanceStatus.UNREACHABLE
		};
		return json({ success: false, status: actionStatus }, { status: 400 });
	}

	const instances = await getPiHoleInstances();
	const instance = instances.find((i) => i.id === instanceId);
	if (!instance) {
		logger.warn({ instanceId }, 'Instance not found for update gravities');
		const actionStatus: ActionStatus = {
			success: false,
			instance: 'Unknown instance',
			message: 'Instance not found',
			instanceStatus: PiHoleInstanceStatus.UNREACHABLE
		};
		return json({ success: false, status: actionStatus }, { status: 404 });
	}

	try {
		const updateSuccess = await updateGravity(instance);
		const actionStatus: ActionStatus = {
			success: updateSuccess,
			instance: instance.name,
			message: updateSuccess ? 'Gravities updated successfully' : 'Failed to update gravities',
			instanceStatus: instance.status
		};
		return json({ success: updateSuccess, status: actionStatus });
	} catch (error) {
		logger.error({ error, instance: instance.name }, 'Error updating gravities');
		const actionStatus: ActionStatus = {
			success: false,
			instance: instance.name,
			message: 'Failed to update gravities',
			instanceStatus: instance.status
		};
		return json({ success: false, status: actionStatus });
	}
};
