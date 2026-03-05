import type { RequestHandler } from './$types';
import { getClientsFromReference, updateClientForInstance } from '$lib/clients/pihole_client';
import { syncItemsFromReference } from '$lib/server/sync';

export const POST: RequestHandler = async () => {
	return syncItemsFromReference('clients', getClientsFromReference, updateClientForInstance);
};
