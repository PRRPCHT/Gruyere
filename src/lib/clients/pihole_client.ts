import { updatePiHoleInstanceCredentials } from '$lib/models/pihole_instances';
import type { Client, Domain, Group, List, PiHoleInstance, Stats } from '$lib/types/types';
import { PiHoleInstanceStatus } from '$lib/types/types';
import logger from '$lib/utils/logger';

const PIHOLE_TIMEOUT_MS = 3000;

// Fetch wrapper that applies a consistent timeout to all Pi-hole API calls
// @param url - The URL to fetch
// @param init - The fetch options
// @returns the fetch response
function piholeFetch(url: string, init?: RequestInit): Promise<Response> {
	return fetch(url, { ...init, signal: AbortSignal.timeout(PIHOLE_TIMEOUT_MS) });
}

// Check if the token is still valid and update the instance credentials if needed
// @param instance - The instance to check authentication for
// @returns true if the authentication is valid, false otherwise
export async function checkAuthentication(instance: PiHoleInstance): Promise<PiHoleInstanceStatus> {
	if (!instance.sid) {
		return authenticate(instance);
	}
	try {
		const response = await piholeFetch(`${instance.url}/api/auth`, {
			method: 'GET',
			headers: {
				'Content-Type': 'application/json',
				sid: instance.sid
			}
		});
		if (response.status !== 200) {
			const toReturn = await authenticate(instance);
			await updatePiHoleInstanceCredentials(instance);
			return toReturn;
		}
		return PiHoleInstanceStatus.ACTIVE;
	} catch (error: unknown) {
		checkError(error, instance, 'Error checking authentication');
		return PiHoleInstanceStatus.UNREACHABLE;
	}
}

// Authenticate with the Pi-hole instance
// @param instance - The instance to authenticate with
// @returns true if the authentication is successful, false otherwise
export async function authenticate(instance: PiHoleInstance): Promise<PiHoleInstanceStatus> {
	logger.info({ instance: instance.name }, 'Authenticating with Pi-hole');
	try {
		const response = await piholeFetch(`${instance.url}/api/auth`, {
			method: 'POST',
			body: JSON.stringify({
				password: instance.apiKey
			})
		});
		if (response.status === 401 || response.status === 403) {
			instance.status = PiHoleInstanceStatus.UNAUTHORIZED;
		} else {
			const data = await response.json();
			if (data.session) {
				instance.sid = data.session.sid;
				instance.csrf = data.session.csrf;
				instance.status = PiHoleInstanceStatus.ACTIVE;
			} else {
				instance.status = PiHoleInstanceStatus.UNREACHABLE;
			}
		}
	} catch (error) {
		checkError(error, instance, 'Error authenticating');
		instance.status = PiHoleInstanceStatus.UNREACHABLE;
	}

	await updatePiHoleInstanceCredentials(instance);
	return instance.status;
}

// Pause DNS blocking for the Pi-hole instance
// @param instance - The instance to pause DNS blocking for
// @param duration - The duration to pause DNS blocking for
// @returns true if the DNS blocking is paused successfully, false otherwise
export async function pauseDNSBlocking(
	instance: PiHoleInstance,
	duration: number
): Promise<boolean> {
	logger.info({ instance: instance.name }, 'Pausing DNS blocking for Pi-hole');
	try {
		const instanceStatus = await checkAuthentication(instance);
		if (instanceStatus !== PiHoleInstanceStatus.ACTIVE) {
			logger.error(
				{ instanceStatus, instance: instance.name },
				'Pausing DNS blocking instance status'
			);
			return false;
		}
		const response = await piholeFetch(`${instance.url}/api/dns/blocking`, {
			method: 'POST',
			body: JSON.stringify({
				csrf: instance.csrf,
				sid: instance.sid,
				timer: duration,
				blocking: false
			})
		});
		return response.status === 200;
	} catch (error) {
		checkError(error, instance, 'Error pausing DNS blocking');
		return false;
	}
}

// Resume DNS blocking for the Pi-hole instance
// @param instance - The instance to resume DNS blocking for
// @returns true if the DNS blocking is resumed successfully, false otherwise
export async function resumeDNSBlocking(instance: PiHoleInstance): Promise<boolean> {
	logger.info({ instance: instance.name }, 'Resuming DNS blocking for Pi-hole');
	try {
		await checkAuthentication(instance);
		const response = await piholeFetch(`${instance.url}/api/dns/blocking`, {
			method: 'POST',
			body: JSON.stringify({
				csrf: instance.csrf,
				sid: instance.sid,
				blocking: true
			})
		});
		return response.status === 200;
	} catch (error) {
		checkError(error, instance, 'Error activating DNS blocking');
		return false;
	}
}

// Update the gravity for the Pi-hole instance
// @param instance - The instance to update gravity for
// @returns true if the gravity is updated successfully, false otherwise
export async function updateGravity(instance: PiHoleInstance): Promise<boolean> {
	logger.info({ instance: instance.name }, 'Updating gravity for Pi-hole');
	try {
		await checkAuthentication(instance);
		const response = await piholeFetch(`${instance.url}/api/action/gravity`, {
			method: 'POST',
			body: JSON.stringify({
				csrf: instance.csrf,
				sid: instance.sid
			})
		});
		return response.status === 200;
	} catch (error) {
		checkError(error, instance, 'Error updating gravity');
		return false;
	}
}

// Restart the DNS for the Pi-hole instance
// @param instance - The instance to restart DNS for
// @returns true if the DNS is restarted successfully, false otherwise
export async function restartDNS(instance: PiHoleInstance): Promise<boolean> {
	logger.info({ instance: instance.name }, 'Restarting DNS for Pi-hole');
	try {
		await checkAuthentication(instance);
		const response = await piholeFetch(`${instance.url}/api/action/restartdns`, {
			method: 'POST',
			body: JSON.stringify({
				csrf: instance.csrf,
				sid: instance.sid
			})
		});
		const data = await response.json();
		return response.status === 200 && data.status === 'ok';
	} catch (error) {
		checkError(error, instance, 'Error restarting DNS');
		return false;
	}
}

// Get the groups from the reference Pi-hole instance
// @param instance - The reference instance to get the groups from
// @returns the groups from the reference
export async function getGroupsFromReference(instance: PiHoleInstance): Promise<Group[] | null> {
	logger.info({ instance: instance.name }, 'Getting groups from reference for Pi-hole');
	try {
		const instanceStatus = await checkAuthentication(instance);
		if (instanceStatus !== PiHoleInstanceStatus.ACTIVE) {
			throw new Error('Instance is not active');
		}
		const response = await piholeFetch(`${instance.url}/api/groups`, {
			method: 'GET',
			headers: {
				'Content-Type': 'application/json',
				sid: instance.sid
			}
		});
		if (response.status !== 200) {
			throw new Error('Failed getting groups from reference');
		}
		const data = await response.json();
		return data.groups ? data.groups : null;
	} catch (error) {
		checkError(error, instance, 'Error getting groups from reference');
		return null;
	}
}

// Update the group for the Pi-hole instance
// @param instance - The instance to update the group for
// @param group - The group to update
// @returns true if the group is updated successfully, false otherwise
export async function updateGroupForInstance(
	instance: PiHoleInstance,
	group: Group
): Promise<boolean> {
	try {
		const response = await piholeFetch(`${instance.url}/api/groups/${group.name}`, {
			method: 'PUT',
			headers: {
				'Content-Type': 'application/json',
				sid: instance.sid
			},
			body: JSON.stringify({ name: group.name, comment: group.comment, enabled: group.enabled })
		});
		if (response.status !== 200) {
			throw new Error('Failed updating group for Pi-hole instance.');
		}
		const data = await response.json();
		logger.debug({ data }, 'Group update response');
		return data.processed.errors.length === 0; //TODO: Change this to check if the group is updated partially
	} catch (error) {
		checkError(error, instance, 'Error updating group');
		return false;
	}
}

// Get the lists from the reference Pi-hole instance
// @param instance - The reference instance to get the lists from
// @returns the lists from the reference
export async function getListsFromReference(instance: PiHoleInstance): Promise<List[] | null> {
	logger.info({ instance: instance.name }, 'Getting lists from reference for Pi-hole');
	try {
		await checkAuthentication(instance);
		const response = await piholeFetch(`${instance.url}/api/lists`, {
			method: 'GET',
			headers: {
				'Content-Type': 'application/json',
				sid: instance.sid
			}
		});
		if (response.status !== 200) {
			throw new Error('Failed getting lists from reference');
		}
		const data = await response.json();
		return data.lists ? data.lists : null;
	} catch (error) {
		checkError(error, instance, 'Error getting lists from reference');
		return null;
	}
}

// Update the list for the Pi-hole instance
// @param instance - The instance to update the list for
// @param list - The list to update
// @returns true if the list is updated successfully, false otherwise
export async function updateListForInstance(
	instance: PiHoleInstance,
	list: List
): Promise<boolean> {
	logger.info({ instance: instance.name }, 'Updating list for Pi-hole');
	try {
		const response = await piholeFetch(`${instance.url}/api/lists/${list.address}`, {
			method: 'PUT',
			headers: {
				'Content-Type': 'application/json',
				sid: instance.sid
			},
			body: JSON.stringify({
				groups: list.groups,
				type: list.type,
				comment: list.comment,
				enabled: list.enabled
			})
		});
		if (response.status !== 200) {
			throw new Error('Failed updating list for Pi-hole instance.');
		}
		const data = await response.json();
		return data.processed.errors.length === 0; //TODO: Change this to check if the list is updated partially
	} catch (error) {
		checkError(error, instance, 'Error updating list');
		return false;
	}
}

// Get the domains from the reference Pi-hole instance
// @param instance - The reference instance to get the domains from
// @returns the domains from the reference
export async function getDomainsFromReference(instance: PiHoleInstance): Promise<Domain[] | null> {
	logger.info({ instance: instance.name }, 'Getting domains from reference for Pi-hole');
	try {
		await checkAuthentication(instance);
		const response = await piholeFetch(`${instance.url}/api/domains`, {
			method: 'GET',
			headers: {
				'Content-Type': 'application/json',
				sid: instance.sid
			}
		});
		if (response.status !== 200) {
			throw new Error('Failed getting domains from reference');
		}
		const data = await response.json();
		return data.domains ? data.domains : null;
	} catch (error) {
		checkError(error, instance, 'Error getting domains from reference');
		return null;
	}
}

// Update the domain for the Pi-hole instance
// @param instance - The instance to update the domain for
// @param domain - The domain to update
// @returns true if the domain is updated successfully, false otherwise
export async function updateDomainForInstance(
	instance: PiHoleInstance,
	domain: Domain
): Promise<boolean> {
	logger.info({ instance: instance.name }, 'Updating domain for Pi-hole');
	try {
		const response = await fetch(
			`${instance.url}/api/domains/${domain.type}/${domain.kind}/${domain.domain}`,
			{
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json',
					sid: instance.sid
				},
				body: JSON.stringify({
					type: domain.type,
					kind: domain.kind,
					comment: domain.comment,
					groups: domain.groups,
					enabled: domain.enabled
				})
			}
		);
		logger.debug({ status: response.status }, 'Domain update response');
		if (response.status !== 200) {
			throw new Error('Failed updating domain for Pi-hole instance.');
		}
		const data = await response.json();
		return data.processed.errors.length === 0; //TODO: Change this to check if the domain is updated partially
	} catch (error) {
		checkError(error, instance, 'Error updating domain');
		return false;
	}
}

// Get the clients from the reference Pi-hole instance
// @param instance - The reference instance to get the clients from
// @returns the clients from the reference
export async function getClientsFromReference(instance: PiHoleInstance): Promise<Client[] | null> {
	logger.info({ instance: instance.name }, 'Getting clients from reference for Pi-hole');
	try {
		await checkAuthentication(instance);
		const response = await piholeFetch(`${instance.url}/api/clients`, {
			method: 'GET',
			headers: {
				'Content-Type': 'application/json',
				sid: instance.sid
			}
		});
		if (response.status !== 200) {
			throw new Error('Failed getting clients from reference');
		}
		const data = await response.json();
		return data.clients ? data.clients : null;
	} catch (error) {
		checkError(error, instance, 'Error getting clients from reference');
		return null;
	}
}

// Update the client for the Pi-hole instance
// @param instance - The instance to update the client for
// @param client - The client to update
// @returns true if the client is updated successfully, false otherwise
export async function updateClientForInstance(
	instance: PiHoleInstance,
	client: Client
): Promise<boolean> {
	logger.info({ instance: instance.name }, 'Updating client for Pi-hole');
	try {
		const response = await piholeFetch(`${instance.url}/api/clients/${client.client}`, {
			method: 'PUT',
			headers: {
				'Content-Type': 'application/json',
				sid: instance.sid
			},
			body: JSON.stringify({
				groups: client.groups,
				comment: client.comment
			})
		});
		if (response.status !== 200) {
			throw new Error('Failed updating client for Pi-hole instance.');
		}
		const data = await response.json();
		return data.processed.errors.length === 0; //TODO: Change this to check if the client is updated partially
	} catch (error) {
		checkError(error, instance, 'Error updating client');
		return false;
	}
}

export async function getStats(instance: PiHoleInstance): Promise<Stats> {
	logger.info({ instance: instance.name }, 'Getting stats for Pi-hole');
	try {
		await checkAuthentication(instance);
		const response = await piholeFetch(`${instance.url}/api/stats/summary`, {
			method: 'GET',
			headers: {
				'Content-Type': 'application/json',
				sid: instance.sid
			}
		});
		if (response.status !== 200) {
			throw new Error('Failed getting stats for Pi-hole instance.');
		}
		const data = await response.json();
		return data;
	} catch (error) {
		checkError(error, instance, 'Error getting stats');
		return {
			queries: {
				total: 0,
				blocked: 0,
				percent_blocked: 0,
				unique_domains: 0,
				forwarded: 0,
				cached: 0,
				frequency: 0
			}
		} as Stats;
	}
}

// Check if the error is a connection timeout or host unreachable or something else and prints it in the console
// @param error - The error to check
// @param instance - The instance to check the error for
// @param message - The message to display
function checkError(error: unknown, instance: PiHoleInstance, message: string) {
	instance.status = PiHoleInstanceStatus.UNREACHABLE;
	const err = error as Error & { cause?: { code?: string } };
	if (
		err.cause?.code === 'UND_ERR_CONNECT_TIMEOUT' ||
		err.cause?.code === 'EHOSTDOWN' ||
		err.cause?.code === 'ECONNREFUSED' ||
		err.message?.includes('timeout') ||
		err.message?.includes('UND_ERR_CONNECT_TIMEOUT') ||
		err.message?.includes('EHOSTDOWN') ||
		err.message?.includes('ECONNREFUSED')
	) {
		logger.warn({ instance: instance.name }, 'Connection timeout or host unreachable');
	} else {
		logger.error({ error, instance: instance.name }, message);
	}
}
