import { json } from '@sveltejs/kit';
import { getPiHoleInstances } from '$lib/models/pihole_instances';
import { checkAuthentication } from '$lib/clients/pihole_client';
import { PiHoleInstanceStatus, type ActionStatus, type PiHoleInstance } from '$lib/types/types';
import logger from '$lib/utils/logger';

// Sync items from the reference Pi-hole instance to all other instances.
// This is the generic implementation behind all four sync routes (groups, lists, domains, clients).
// @param itemName - Human-readable name for logging (e.g. "groups", "lists")
// @param getFromReference - Function that fetches items from the reference instance
// @param updateOneForInstance - Function that updates a single item on a target instance
// @returns a SvelteKit JSON response
export async function syncItemsFromReference<T>(
	itemName: string,
	getFromReference: (instance: PiHoleInstance) => Promise<T[] | null>,
	updateOneForInstance: (instance: PiHoleInstance, item: T) => Promise<boolean>
): Promise<Response> {
	logger.info(`Updating ${itemName} from reference`);
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
		const items = await getFromReference(reference);
		if (items === null) {
			const actionStatus: ActionStatus = {
				success: false,
				instance: reference.name,
				message: `Couldn't get the ${itemName} from the reference`,
				instanceStatus: reference.status
			};
			return json({ success: false, status: actionStatus, statuses: null }, { status: 502 });
		}

		const statuses: ActionStatus[] = [];
		const promises = instances.map(async (instance) => {
			if (!instance.isReference) {
				const actionStatus = await syncItemsToInstance(
					instance,
					items,
					itemName,
					updateOneForInstance
				);
				statuses.push(actionStatus);
				return actionStatus;
			}
		});
		await Promise.all(promises);
		return json({ success: true, status: null, statuses }, { status: 200 });
	} catch (error) {
		logger.error(
			{ error, reference: reference.name },
			`Error getting the ${itemName} from the reference`
		);
		const actionStatus: ActionStatus = {
			success: false,
			instance: reference.name,
			message: `Failed to get the ${itemName} from the reference`,
			instanceStatus: reference.status
		};
		return json({ success: false, status: actionStatus });
	}
}

// Sync all items of a given type to a single target instance.
// Authenticates once, then updates all items in parallel.
// @param instance - The target instance
// @param items - The items to sync
// @param itemName - Human-readable name for logging
// @param updateOne - Function that updates a single item on the instance
// @returns the action status for this instance
async function syncItemsToInstance<T>(
	instance: PiHoleInstance,
	items: T[],
	itemName: string,
	updateOne: (instance: PiHoleInstance, item: T) => Promise<boolean>
): Promise<ActionStatus> {
	logger.debug({ instance: instance.name }, `Updating ${itemName} for instance`);
	try {
		const status = await checkAuthentication(instance);
		if (status !== PiHoleInstanceStatus.ACTIVE) {
			return {
				success: false,
				instance: instance.name,
				message: 'Instance is not active',
				instanceStatus: instance.status
			};
		}
		const results = await Promise.all(items.map((item) => updateOne(instance, item)));
		const updateSuccess = results.every(Boolean);
		return {
			success: updateSuccess,
			instance: instance.name,
			message: updateSuccess
				? `${capitalize(itemName)} updated successfully`
				: `Failed to update ${itemName}`,
			instanceStatus: instance.status
		};
	} catch (error) {
		logger.error({ error, instance: instance.name }, `Error updating ${itemName}`);
		return {
			success: false,
			instance: instance.name,
			message: `Failed to update ${itemName}`,
			instanceStatus: instance.status
		};
	}
}

function capitalize(s: string): string {
	return s.charAt(0).toUpperCase() + s.slice(1);
}
