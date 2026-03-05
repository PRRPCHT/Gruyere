import type { RequestHandler } from './$types';
import { getGroupsFromReference, updateGroupForInstance } from '$lib/clients/pihole_client';
import { syncItemsFromReference } from '$lib/server/sync';

export const POST: RequestHandler = async () => {
	return syncItemsFromReference('groups', getGroupsFromReference, updateGroupForInstance);
};
