import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('$lib/models/pihole_instances', () => ({
	getPiHoleInstances: vi.fn(),
	savePiHoleInstances: vi.fn()
}));

vi.mock('$lib/clients/pihole_client', () => ({
	checkAuthentication: vi.fn()
}));

vi.mock('$lib/utils/logger', () => ({
	default: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() }
}));

import { GET } from './+server';
import { getPiHoleInstances, savePiHoleInstances } from '$lib/models/pihole_instances';
import { checkAuthentication } from '$lib/clients/pihole_client';
import { PiHoleInstanceStatus } from '$lib/types/types';
import type { PiHoleInstance } from '$lib/types/types';

const mockedGetInstances = vi.mocked(getPiHoleInstances);
const mockedSaveInstances = vi.mocked(savePiHoleInstances);
const mockedCheckAuth = vi.mocked(checkAuthentication);

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

describe('GET /api/refreshInstancesStatus', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockedSaveInstances.mockResolvedValue(undefined);
	});

	it('returns all instances (without secrets) with updated statuses', async () => {
		mockedGetInstances.mockResolvedValue([
			makeInstance({ id: 1, name: 'Pi-hole 1' }),
			makeInstance({ id: 2, name: 'Pi-hole 2' })
		]);
		mockedCheckAuth.mockResolvedValue(PiHoleInstanceStatus.ACTIVE);

		const response = await GET({} as never);

		expect(response.status).toBe(200);
		const body = await response.json();
		expect(body.success).toBe(true);
		expect(body.instances).toHaveLength(2);
		expect(body.instances[0]).not.toHaveProperty('sid');
		expect(body.instances[0]).not.toHaveProperty('csrf');
		expect(body.instances[0]).not.toHaveProperty('apiKey');
	});

	it('calls checkAuthentication for each instance', async () => {
		mockedGetInstances.mockResolvedValue([makeInstance({ id: 1 }), makeInstance({ id: 2 })]);
		mockedCheckAuth.mockResolvedValue(PiHoleInstanceStatus.ACTIVE);

		await GET({} as never);

		expect(mockedCheckAuth).toHaveBeenCalledTimes(2);
	});

	it('saves to file when at least one status changes', async () => {
		mockedGetInstances.mockResolvedValue([makeInstance({ status: PiHoleInstanceStatus.ACTIVE })]);
		// Returns a different status → mutation makes both equal (known bug)
		mockedCheckAuth.mockResolvedValue(PiHoleInstanceStatus.UNREACHABLE);

		await GET({} as never);

		expect(mockedSaveInstances).toHaveBeenCalledOnce();
	});

	it('does not save to file when all statuses are unchanged', async () => {
		mockedGetInstances.mockResolvedValue([makeInstance({ status: PiHoleInstanceStatus.ACTIVE })]);
		mockedCheckAuth.mockResolvedValue(PiHoleInstanceStatus.ACTIVE);

		await GET({} as never);

		expect(mockedSaveInstances).not.toHaveBeenCalled();
	});
});
