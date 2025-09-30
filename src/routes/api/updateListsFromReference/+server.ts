import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	PiHoleInstanceStatus,
	type ActionStatus,
	type Group,
	type List,
	type PiHoleInstance
} from '$lib/types/types';
import {
	getGroupsFromReference,
	getListsFromReference,
	updateGroupForInstance,
	updateListForInstance
} from '$lib/clients/pihole_client';
import { getPiHoleInstances } from '$lib/models/pihole_instances';
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
	logger.info('Updating lists from reference');
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
		const listsFromReference = await getListsFromReference(reference);
		if (listsFromReference !== null) {
			let statuses: ActionStatus[] = [];
			const instances = await getPiHoleInstances();
			const promises = instances.map(async (instance) => {
				if (!instance.isReference) {
					const actionStatus = await updateListsForInstance(instance, listsFromReference);
					statuses.push(actionStatus);
					return actionStatus;
				}
			});
			await Promise.all(promises);
			return json({ success: true, status: null, statuses: statuses }, { status: 200 });
		}
		const actionStatus: ActionStatus = {
			success: false,
			instance: reference.name,
			message: "Couldn't get the lists from the reference",
			instanceStatus: reference.status
		};
		return json({ success: true, status: actionStatus, statuses: null });
	} catch (error) {
		logger.error(
			{ error, reference: reference.name },
			'Error getting the lists from the reference'
		);
		let actionStatus: ActionStatus = {
			success: false,
			instance: reference.name,
			message: 'Failed to get the lists from the reference',
			instanceStatus: reference.status
		};
		return json({ success: false, status: actionStatus });
	}
};

// Update the groups for the instance
// @param instance - The instance to update the lists for
// @param listsFromReference - The lists from the reference
// @returns the action status
async function updateListsForInstance(
	instance: PiHoleInstance,
	listsFromReference: List[]
): Promise<ActionStatus> {
	logger.debug({ instance: instance.name }, 'Updating lists for instance');
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
		for (const list of listsFromReference) {
			updateSuccess = updateSuccess && (await updateListForInstance(instance, list));
		}
		const actionStatus: ActionStatus = {
			success: updateSuccess,
			instance: instance.name,
			message: updateSuccess ? 'Lists updated successfully' : 'Failed to update lists',
			instanceStatus: instance.status
		};
		return actionStatus;
	} catch (error) {
		logger.error({ error, instance: instance.name }, 'Error updating lists');
		const actionStatus: ActionStatus = {
			success: false,
			instance: instance.name,
			message: 'Failed to update lists',
			instanceStatus: instance.status
		};
		return actionStatus;
	}
}
