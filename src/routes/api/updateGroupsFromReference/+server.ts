import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	PiHoleInstanceStatus,
	type ActionStatus,
	type Group,
	type PiHoleInstance
} from '$lib/types/types';
import { getGroupsFromReference, updateGroupForInstance } from '$lib/clients/pihole_client';
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
	logger.info('Updating groups from reference');
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
		const groupsFromReference = await getGroupsFromReference(reference);
		if (groupsFromReference !== null) {
			let statuses: ActionStatus[] = [];
			const instances = await getPiHoleInstances();
			const promises = instances.map(async (instance) => {
				if (!instance.isReference) {
					const actionStatus = await updateGroupsForInstance(instance, groupsFromReference);
					logger.debug({ actionStatus, instance: instance.name }, 'Group update action status');
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
			message: "Couldn't get the groups from the reference",
			instanceStatus: reference.status
		};
		return json({ success: true, status: actionStatus, statuses: null });
	} catch (error) {
		logger.error(
			{ error, reference: reference.name },
			'Error getting the groups from the reference'
		);
		let actionStatus: ActionStatus = {
			success: false,
			instance: reference.name,
			message: 'Failed to get the groups from the reference',
			instanceStatus: reference.status
		};
		return json({ success: false, status: actionStatus });
	}
};

// Update the groups for the instance
// @param instance - The instance to update the groups for
// @param groupsFromReference - The groups from the reference
// @returns the action status
async function updateGroupsForInstance(
	instance: PiHoleInstance,
	groupsFromReference: Group[]
): Promise<ActionStatus> {
	logger.debug({ instance: instance.name }, 'Updating groups for instance');
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
		for (const group of groupsFromReference) {
			updateSuccess = updateSuccess && (await updateGroupForInstance(instance, group));
		}
		const actionStatus: ActionStatus = {
			success: updateSuccess,
			instance: instance.name,
			message: updateSuccess ? 'Groups updated successfully' : 'Failed to update groups',
			instanceStatus: instance.status
		};
		return actionStatus;
	} catch (error) {
		logger.error({ error, instance: instance.name }, 'Error updating groups');
		const actionStatus: ActionStatus = {
			success: false,
			instance: instance.name,
			message: 'Failed to update groups',
			instanceStatus: instance.status
		};
		return actionStatus;
	}
}
