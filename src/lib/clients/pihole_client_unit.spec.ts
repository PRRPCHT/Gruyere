import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import {
	authenticate,
	checkAuthentication,
	pauseDNSBlocking,
	resumeDNSBlocking,
	restartDNS,
	getStats,
	getGroupsFromReference,
	updateGroupForInstance,
	updateListForInstance,
	updateDomainForInstance,
	updateClientForInstance
} from './pihole_client';
import { PiHoleInstanceStatus, DomainType, DomainKind, ListType } from '$lib/types/types';
import type { PiHoleInstance, Group, List, Domain, Client } from '$lib/types/types';

vi.mock('$lib/utils/logger', () => ({
	default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }
}));

vi.mock('$lib/models/pihole_instances', () => ({
	updatePiHoleInstanceCredentials: vi.fn().mockResolvedValue(undefined)
}));

function makeInstance(overrides: Partial<PiHoleInstance> = {}): PiHoleInstance {
	return {
		id: 1,
		name: 'Test Pi-hole',
		url: 'http://pihole.local',
		apiKey: 'api-key',
		isReference: false,
		sid: 'valid-sid',
		csrf: 'valid-csrf',
		status: PiHoleInstanceStatus.ACTIVE,
		...overrides
	};
}

function mockResponse(status: number, body: unknown = {}): Response {
	return { status, json: () => Promise.resolve(body) } as Response;
}

// Returns a valid 200 auth-check response (GET /api/auth) so checkAuthentication passes
function authOk() {
	return mockResponse(200);
}

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
	fetchMock = vi.fn();
	vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
	vi.unstubAllGlobals();
});

// ---------------------------------------------------------------------------
// authenticate
// ---------------------------------------------------------------------------

describe('authenticate', () => {
	it('sets sid, csrf, and ACTIVE status on success', async () => {
		const instance = makeInstance({ sid: '', csrf: '', status: PiHoleInstanceStatus.UNREACHABLE });
		fetchMock.mockResolvedValueOnce(
			mockResponse(200, { session: { sid: 'new-sid', csrf: 'new-csrf' } })
		);

		await authenticate(instance);

		expect(instance.sid).toBe('new-sid');
		expect(instance.csrf).toBe('new-csrf');
		expect(instance.status).toBe(PiHoleInstanceStatus.ACTIVE);
	});

	it('sets UNAUTHORIZED status on 401', async () => {
		const instance = makeInstance();
		fetchMock.mockResolvedValueOnce(mockResponse(401));

		await authenticate(instance);

		expect(instance.status).toBe(PiHoleInstanceStatus.UNAUTHORIZED);
	});

	it('sets UNAUTHORIZED status on 403', async () => {
		const instance = makeInstance();
		fetchMock.mockResolvedValueOnce(mockResponse(403));

		await authenticate(instance);

		expect(instance.status).toBe(PiHoleInstanceStatus.UNAUTHORIZED);
	});

	it('sets UNREACHABLE status on network error', async () => {
		const instance = makeInstance();
		fetchMock.mockRejectedValueOnce(new Error('ECONNREFUSED'));

		await authenticate(instance);

		expect(instance.status).toBe(PiHoleInstanceStatus.UNREACHABLE);
	});
});

// ---------------------------------------------------------------------------
// checkAuthentication
// ---------------------------------------------------------------------------

describe('checkAuthentication', () => {
	it('returns ACTIVE when the current sid is still valid', async () => {
		// GET /api/auth returns 200 → sid is valid
		fetchMock.mockResolvedValueOnce(mockResponse(200));

		const status = await checkAuthentication(makeInstance());

		expect(status).toBe(PiHoleInstanceStatus.ACTIVE);
	});

	it('re-authenticates and returns ACTIVE when sid is expired', async () => {
		const instance = makeInstance();
		// First call: GET /api/auth → 401 (sid expired)
		// Second call: POST /api/auth → success with session
		fetchMock
			.mockResolvedValueOnce(mockResponse(401))
			.mockResolvedValueOnce(
				mockResponse(200, { session: { sid: 'fresh-sid', csrf: 'fresh-csrf' } })
			);

		const status = await checkAuthentication(instance);

		expect(status).toBe(PiHoleInstanceStatus.ACTIVE);
		expect(instance.sid).toBe('fresh-sid');
	});
});

// ---------------------------------------------------------------------------
// pauseDNSBlocking
// ---------------------------------------------------------------------------

describe('pauseDNSBlocking', () => {
	it('sends correct duration and returns true on success', async () => {
		// Call 0: checkAuthentication GET → ACTIVE
		// Call 1: POST /dns/blocking → 200
		fetchMock.mockResolvedValueOnce(authOk()).mockResolvedValueOnce(mockResponse(200));

		const result = await pauseDNSBlocking(makeInstance(), 120);

		expect(result).toBe(true);
		const [, init] = fetchMock.mock.calls[1];
		const body = JSON.parse(init.body as string);
		expect(body.timer).toBe(120);
		expect(body.blocking).toBe(false);
	});

	it('returns false when instance is not ACTIVE', async () => {
		// checkAuthentication GET → 401, re-auth → 401 → UNAUTHORIZED
		fetchMock.mockResolvedValue(mockResponse(401));

		const result = await pauseDNSBlocking(makeInstance(), 60);

		expect(result).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// resumeDNSBlocking
// ---------------------------------------------------------------------------

describe('resumeDNSBlocking', () => {
	it('returns true on success', async () => {
		fetchMock.mockResolvedValueOnce(authOk()).mockResolvedValueOnce(mockResponse(200));

		const result = await resumeDNSBlocking(makeInstance());

		expect(result).toBe(true);
		const [, init] = fetchMock.mock.calls[1];
		expect(JSON.parse(init.body as string).blocking).toBe(true);
	});

	it('returns false on non-200 response', async () => {
		fetchMock.mockResolvedValueOnce(authOk()).mockResolvedValueOnce(mockResponse(500));

		expect(await resumeDNSBlocking(makeInstance())).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// restartDNS
// ---------------------------------------------------------------------------

describe('restartDNS', () => {
	it('returns true only when status 200 and data.status === ok', async () => {
		fetchMock
			.mockResolvedValueOnce(authOk())
			.mockResolvedValueOnce(mockResponse(200, { status: 'ok' }));

		expect(await restartDNS(makeInstance())).toBe(true);
	});

	it('returns false when status is 200 but data.status is not ok', async () => {
		fetchMock
			.mockResolvedValueOnce(authOk())
			.mockResolvedValueOnce(mockResponse(200, { status: 'error' }));

		expect(await restartDNS(makeInstance())).toBe(false);
	});

	it('returns false on non-200 response', async () => {
		fetchMock
			.mockResolvedValueOnce(authOk())
			.mockResolvedValueOnce(mockResponse(500, { status: 'ok' }));

		expect(await restartDNS(makeInstance())).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// getStats
// ---------------------------------------------------------------------------

describe('getStats', () => {
	it('returns default zero-filled stats on error', async () => {
		fetchMock.mockRejectedValue(new Error('network failure'));

		const stats = await getStats(makeInstance());

		expect(stats.queries.total).toBe(0);
		expect(stats.queries.blocked).toBe(0);
		expect(stats.queries.percent_blocked).toBe(0);
	});
});

// ---------------------------------------------------------------------------
// getGroupsFromReference
// ---------------------------------------------------------------------------

describe('getGroupsFromReference', () => {
	it('returns null when instance is not ACTIVE', async () => {
		// checkAuthentication → 401, re-auth → 401 → UNAUTHORIZED
		fetchMock.mockResolvedValue(mockResponse(401));

		const result = await getGroupsFromReference(makeInstance());

		expect(result).toBeNull();
	});

	it('returns parsed groups array on success', async () => {
		const groups: Group[] = [
			{
				id: 1,
				name: 'Default',
				comment: null,
				enabled: true,
				date_added: 0,
				date_modified: 0
			}
		];
		fetchMock.mockResolvedValueOnce(authOk()).mockResolvedValueOnce(mockResponse(200, { groups }));

		const result = await getGroupsFromReference(makeInstance());

		expect(result).toEqual(groups);
	});
});

// ---------------------------------------------------------------------------
// updateGroupForInstance
// ---------------------------------------------------------------------------

describe('updateGroupForInstance', () => {
	const group: Group = {
		id: 1,
		name: 'Default',
		comment: 'test',
		enabled: true,
		date_added: 0,
		date_modified: 0
	};

	it('returns true when processed.errors is empty', async () => {
		fetchMock.mockResolvedValueOnce(
			mockResponse(200, { processed: { errors: [], success: [group] } })
		);

		expect(await updateGroupForInstance(makeInstance(), group)).toBe(true);
	});

	it('returns false when processed.errors is non-empty', async () => {
		fetchMock.mockResolvedValueOnce(
			mockResponse(200, { processed: { errors: [{ error: 'conflict' }], success: [] } })
		);

		expect(await updateGroupForInstance(makeInstance(), group)).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// updateListForInstance
// ---------------------------------------------------------------------------

describe('updateListForInstance', () => {
	const list: List = {
		id: 1,
		address: 'https://example.com/blocklist.txt',
		type: ListType.BLOCK,
		comment: 'test list',
		groups: [1, 2],
		enabled: true,
		date_added: 0,
		date_modified: 0,
		date_updated: 0,
		valid_domains: 0,
		invalid_domains: 0,
		abp_entries: 0,
		status: 0
	};

	it('sends correct payload (address, type, comment, groups, enabled)', async () => {
		fetchMock.mockResolvedValueOnce(
			mockResponse(200, { processed: { errors: [], success: [list] } })
		);

		await updateListForInstance(makeInstance(), list);

		const [url, init] = fetchMock.mock.calls[0];
		expect(url).toContain(list.address);
		const body = JSON.parse(init.body as string);
		expect(body.type).toBe(list.type);
		expect(body.comment).toBe(list.comment);
		expect(body.groups).toEqual(list.groups);
		expect(body.enabled).toBe(list.enabled);
	});
});

// ---------------------------------------------------------------------------
// updateDomainForInstance
// ---------------------------------------------------------------------------

describe('updateDomainForInstance', () => {
	const domain: Domain = {
		id: 1,
		domain: 'ads.example.com',
		unicode: 'ads.example.com',
		type: DomainType.DENY,
		kind: DomainKind.EXACT,
		comment: 'test domain',
		groups: [1],
		enabled: true,
		date_added: 0,
		date_modified: 0
	};

	it('sends correct payload (type, kind, comment, groups, enabled)', async () => {
		fetchMock.mockResolvedValueOnce(
			mockResponse(200, { processed: { errors: [], success: [domain] } })
		);

		await updateDomainForInstance(makeInstance(), domain);

		const [url, init] = fetchMock.mock.calls[0];
		expect(url).toContain(domain.type);
		expect(url).toContain(domain.kind);
		expect(url).toContain(domain.domain);
		const body = JSON.parse(init.body as string);
		expect(body.comment).toBe(domain.comment);
		expect(body.groups).toEqual(domain.groups);
		expect(body.enabled).toBe(domain.enabled);
	});
});

// ---------------------------------------------------------------------------
// updateClientForInstance
// ---------------------------------------------------------------------------

describe('updateClientForInstance', () => {
	const client: Client = {
		id: 1,
		client: '192.168.1.100',
		comment: 'test client',
		groups: [1],
		name: 'my-device',
		date_added: 0,
		date_modified: 0
	};

	it('sends correct payload (groups, comment)', async () => {
		fetchMock.mockResolvedValueOnce(
			mockResponse(200, { processed: { errors: [], success: [client] } })
		);

		await updateClientForInstance(makeInstance(), client);

		const [url, init] = fetchMock.mock.calls[0];
		expect(url).toContain(client.client);
		const body = JSON.parse(init.body as string);
		expect(body.groups).toEqual(client.groups);
		expect(body.comment).toBe(client.comment);
	});
});

// ---------------------------------------------------------------------------
// piholeFetch — timeout enforcement
// ---------------------------------------------------------------------------

describe('piholeFetch', () => {
	it('calls fetch with an AbortSignal for timeout enforcement', async () => {
		// Use any exported function that goes through piholeFetch
		fetchMock.mockResolvedValueOnce(mockResponse(200));

		await checkAuthentication(makeInstance());

		const [, init] = fetchMock.mock.calls[0];
		expect(init.signal).toBeInstanceOf(AbortSignal);
	});
});

// ---------------------------------------------------------------------------
// checkError — UNREACHABLE + logging
// ---------------------------------------------------------------------------

describe('checkError (via authenticate)', () => {
	it('sets UNREACHABLE and logs warn for connection errors', async () => {
		const logger = (await import('$lib/utils/logger')).default;
		const instance = makeInstance();
		const connError = new Error('UND_ERR_CONNECT_TIMEOUT');
		fetchMock.mockRejectedValueOnce(connError);

		await authenticate(instance);

		expect(instance.status).toBe(PiHoleInstanceStatus.UNREACHABLE);
		expect(vi.mocked(logger.warn)).toHaveBeenCalled();
		expect(vi.mocked(logger.error)).not.toHaveBeenCalledWith(
			expect.objectContaining({ error: connError }),
			expect.any(String)
		);
	});

	it('sets UNREACHABLE and logs error for unexpected errors', async () => {
		const logger = (await import('$lib/utils/logger')).default;
		vi.mocked(logger.error).mockClear();
		const instance = makeInstance();
		fetchMock.mockRejectedValueOnce(new Error('unexpected failure'));

		await authenticate(instance);

		expect(instance.status).toBe(PiHoleInstanceStatus.UNREACHABLE);
		expect(vi.mocked(logger.error)).toHaveBeenCalled();
	});
});
