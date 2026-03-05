import type { RequestHandler } from './$types';
import { getDomainsFromReference, updateDomainForInstance } from '$lib/clients/pihole_client';
import { syncItemsFromReference } from '$lib/server/sync';

export const POST: RequestHandler = async () => {
	return syncItemsFromReference('domains', getDomainsFromReference, updateDomainForInstance);
};
