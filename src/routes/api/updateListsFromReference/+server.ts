import type { RequestHandler } from './$types';
import { getListsFromReference, updateListForInstance } from '$lib/clients/pihole_client';
import { syncItemsFromReference } from '$lib/server/sync';

export const POST: RequestHandler = async () => {
	return syncItemsFromReference('lists', getListsFromReference, updateListForInstance);
};
