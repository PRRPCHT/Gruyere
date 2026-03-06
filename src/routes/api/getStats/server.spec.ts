import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('$lib/models/pihole_instances', () => ({
	getPiHoleInstances: vi.fn()
}));

vi.mock('$lib/clients/pihole_client', () => ({
	getStats: vi.fn()
}));

import { GET } from './+server';
import { getPiHoleInstances } from '$lib/models/pihole_instances';
import { getStats } from '$lib/clients/pihole_client';
import { PiHoleInstanceStatus } from '$lib/types/types';
import type { PiHoleInstance } from '$lib/types/types';

const mockedGetInstances = vi.mocked(getPiHoleInstances);
const mockedGetStats = vi.mocked(getStats);

function makeInstance(overrides: Partial<PiHoleInstance> = {}): PiHoleInstance {
	return {
		id: 1,
		name: 'Pi-hole 1',
		url: 'http://192.168.1.1:80',
		apiKey: 'secret-api-key',
		isReference: false,
		sid: 'secret-sid',
		csrf: 'secret-csrf',
		status: PiHoleInstanceStatus.ACTIVE,
		...overrides
	};
}

function makeEvent(params: Record<string, string>) {
	const url = new URL('http://localhost/api/getStats');
	for (const [key, value] of Object.entries(params)) {
		url.searchParams.set(key, value);
	}
	return { url };
}

const MOCK_STATS = {
	queries: { total: 100, blocked: 10, percent_blocked: 10, unique_domains: 50 },
	clients: { active: 5, total: 10 },
	gravity: { domains_being_blocked: 200000 }
};

describe('GET /api/getStats', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockedGetStats.mockResolvedValue(MOCK_STATS as never);
	});

	it('returns 400 when instance query param is missing', async () => {
		const response = await GET(makeEvent({}) as never);

		expect(response.status).toBe(400);
		const body = await response.json();
		expect(body).toMatchObject({ error: expect.any(String) });
	});

	it('returns 404 when instance ID does not match any instance', async () => {
		mockedGetInstances.mockResolvedValue([makeInstance({ id: 1 })]);

		const response = await GET(makeEvent({ instance: '99' }) as never);

		expect(response.status).toBe(404);
		const body = await response.json();
		expect(body).toMatchObject({ error: expect.any(String) });
	});

	it('returns stats and instanceStatus for a valid instance ID', async () => {
		const instance = makeInstance({ id: 1, status: PiHoleInstanceStatus.ACTIVE });
		mockedGetInstances.mockResolvedValue([instance]);

		const response = await GET(makeEvent({ instance: '1' }) as never);

		expect(response.status).toBe(200);
		const body = await response.json();
		expect(body.stats).toEqual(MOCK_STATS);
		expect(body.instanceStatus).toBe(PiHoleInstanceStatus.ACTIVE);
	});

	it('calls getStats with the matched instance', async () => {
		const instance = makeInstance({ id: 1 });
		mockedGetInstances.mockResolvedValue([instance]);

		await GET(makeEvent({ instance: '1' }) as never);

		expect(mockedGetStats).toHaveBeenCalledWith(instance);
	});
});
