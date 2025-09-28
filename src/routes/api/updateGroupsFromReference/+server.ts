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
	console.log('Updating groups from reference');
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
					console.log('The action status is:', actionStatus);
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
		console.error('Error getting the groups from the reference:', error);
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
	console.log('Updating groups for instance', instance.name);
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
		console.error('Error updating groups:', error);
		const actionStatus: ActionStatus = {
			success: false,
			instance: instance.name,
			message: 'Failed to update groups',
			instanceStatus: instance.status
		};
		return actionStatus;
	}
}
