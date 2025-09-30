import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getPiHoleInstances } from '$lib/models/pihole_instances';
import { getClientsFromReference, updateClientForInstance } from '$lib/clients/pihole_client';
import {
	PiHoleInstanceStatus,
	type ActionStatus,
	type Client,
	type PiHoleInstance
} from '$lib/types/types';
import logger from '$lib/utils/logger';

export const POST: RequestHandler = async ({ request, cookies }) => {
	// Check authentication
	const sessionCookie = cookies.get('auth_session');
	if (!sessionCookie || Date.now() >= parseInt(sessionCookie)) {
		const actionStatus: ActionStatus = {
			success: false,
			instance: 'Unknown instance',
			message: 'Unauthorized',
			instanceStatus: PiHoleInstanceStatus.UNAUTHORIZED
		};
		return json({ success: false, status: actionStatus }, { status: 401 });
	}
	logger.info('Updating clients from reference');
	const instances = await getPiHoleInstances();
	const reference = instances.find((instance) => instance.isReference);
	if (!reference) {
		const actionStatus: ActionStatus = {
			success: false,
			instance: 'Unknown instance',
			message: 'Reference instance not found',
			instanceStatus: PiHoleInstanceStatus.UNREACHABLE
		};
		return json({ success: false, status: actionStatus }, { status: 400 });
	}
	try {
		const clientsFromReference = await getClientsFromReference(reference);
		if (clientsFromReference !== null) {
			let statuses: ActionStatus[] = [];
			const instances = await getPiHoleInstances();
			const promises = instances.map(async (instance) => {
				if (!instance.isReference) {
					const actionStatus = await updateClientsForInstance(instance, clientsFromReference);
					statuses.push(actionStatus);
					return actionStatus;
				}
			});
			await Promise.all(promises);
			return json({ success: true, status: null, statuses: statuses }, { status: 200 });
		}
	} catch (error) {
		logger.error(
			{ error, reference: reference.name },
			'Error updating the clients from the reference'
		);
		let actionStatus: ActionStatus = {
			success: false,
			instance: reference.name,
			message: 'Failed to update the clients from the reference',
			instanceStatus: PiHoleInstanceStatus.UNREACHABLE
		};
		return json({ success: false, status: actionStatus });
	}
	const actionStatus: ActionStatus = {
		success: false,
		instance: reference.name,
		message: "Couldn't update the clients from the reference",
		instanceStatus: reference.status
	};
	return json({ success: true, status: actionStatus, statuses: null });
};

// Update the clients for the instance
// @param instance - The instance to update the clients for
// @param clientsFromReference - The clients from the reference
// @returns the action status
async function updateClientsForInstance(
	instance: PiHoleInstance,
	clientsFromReference: Client[]
): Promise<ActionStatus> {
	logger.debug({ instance: instance.name }, 'Updating clients for instance');
	try {
		let updateSuccess = true;
		const status = instance.status;
		if (status !== PiHoleInstanceStatus.ACTIVE) {
			const actionStatus: ActionStatus = {
				success: false,
				instance: instance.name,
				message: 'Instance is not active',
				instanceStatus: instance.status
			};
			return actionStatus;
		}
		for (const client of clientsFromReference) {
			updateSuccess = updateSuccess && (await updateClientForInstance(instance, client));
		}
		const actionStatus: ActionStatus = {
			success: updateSuccess,
			instance: instance.name,
			message: updateSuccess ? 'Clients updated successfully' : 'Failed to update clients',
			instanceStatus: instance.status
		};
		return actionStatus;
	} catch (error) {
		logger.error({ error, instance: instance.name }, 'Error updating clients');
		const actionStatus: ActionStatus = {
			success: false,
			instance: instance.name,
			message: 'Failed to update clients',
			instanceStatus: instance.status
		};
		return actionStatus;
	}
}
