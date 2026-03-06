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

function makeEvent(params: Record<string, string>) {
	const url = new URL('http://localhost/api/refreshInstanceStatus');
	for (const [key, value] of Object.entries(params)) {
		url.searchParams.set(key, value);
	}
	return { url };
}

describe('GET /api/refreshInstanceStatus', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockedSaveInstances.mockResolvedValue(undefined);
	});

	it('returns 400 when id query param is missing', async () => {
		const response = await GET(makeEvent({}) as never);

		expect(response.status).toBe(400);
	});

	it('returns 404 when instance ID does not match any instance', async () => {
		mockedGetInstances.mockResolvedValue([makeInstance({ id: 1 })]);

		const response = await GET(makeEvent({ id: '99' }) as never);

		expect(response.status).toBe(404);
	});

	it('returns updated instance data (without secrets) on success', async () => {
		mockedGetInstances.mockResolvedValue([makeInstance()]);
		mockedCheckAuth.mockResolvedValue(PiHoleInstanceStatus.ACTIVE);

		const response = await GET(makeEvent({ id: '1' }) as never);

		expect(response.status).toBe(200);
		const body = await response.json();
		expect(body.success).toBe(true);
		expect(body.instance).toBeDefined();
		expect(body.instance).not.toHaveProperty('sid');
		expect(body.instance).not.toHaveProperty('csrf');
		expect(body.instance).not.toHaveProperty('apiKey');
	});

	it('saves to file when status changes', async () => {
		mockedGetInstances.mockResolvedValue([makeInstance({ status: PiHoleInstanceStatus.ACTIVE })]);
		// checkAuthentication returns a different status → mutation makes both equal (known bug)
		mockedCheckAuth.mockResolvedValue(PiHoleInstanceStatus.UNREACHABLE);

		await GET(makeEvent({ id: '1' }) as never);

		expect(mockedSaveInstances).toHaveBeenCalledOnce();
	});

	it('does not save to file when status is unchanged', async () => {
		mockedGetInstances.mockResolvedValue([makeInstance({ status: PiHoleInstanceStatus.ACTIVE })]);
		mockedCheckAuth.mockResolvedValue(PiHoleInstanceStatus.ACTIVE);

		await GET(makeEvent({ id: '1' }) as never);

		expect(mockedSaveInstances).not.toHaveBeenCalled();
	});
});
