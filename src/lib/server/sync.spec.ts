import { describe, expect, it, vi, beforeEach } from 'vitest';
import { syncItemsFromReference } from './sync';
import { PiHoleInstanceStatus } from '$lib/types/types';
import type { PiHoleInstance } from '$lib/types/types';

vi.mock('$lib/utils/logger', () => ({
	default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }
}));

const getPiHoleInstancesMock = vi.fn<() => Promise<PiHoleInstance[]>>();
vi.mock('$lib/models/pihole_instances', () => ({
	getPiHoleInstances: (...args: unknown[]) => getPiHoleInstancesMock(...args)
}));

const checkAuthenticationMock = vi.fn<(i: PiHoleInstance) => Promise<PiHoleInstanceStatus>>();
vi.mock('$lib/clients/pihole_client', () => ({
	checkAuthentication: (...args: unknown[]) => checkAuthenticationMock(...args)
}));

function makeInstance(overrides: Partial<PiHoleInstance> = {}): PiHoleInstance {
	return {
		id: 1,
		name: 'Pi-hole 1',
		url: 'http://192.168.1.1',
		apiKey: 'key',
		isReference: false,
		sid: 'sid',
		csrf: 'csrf',
		status: PiHoleInstanceStatus.ACTIVE,
		...overrides
	};
}

beforeEach(() => {
	getPiHoleInstancesMock.mockReset();
	checkAuthenticationMock.mockReset();
});

async function parseJson(response: Response) {
	return response.json();
}

describe('syncItemsFromReference', () => {
	it('returns 400 when no reference instance exists', async () => {
		getPiHoleInstancesMock.mockResolvedValue([
			makeInstance({ id: 1, isReference: false }),
			makeInstance({ id: 2, isReference: false })
		]);

		const response = await syncItemsFromReference('groups', vi.fn(), vi.fn());

		expect(response.status).toBe(400);
		const body = await parseJson(response);
		expect(body.success).toBe(false);
		expect(body.status.message).toContain('Reference instance not found');
	});

	it('returns 502 when reference fetch returns null', async () => {
		const reference = makeInstance({ id: 1, isReference: true });
		getPiHoleInstancesMock.mockResolvedValue([reference]);
		const getFromReference = vi.fn().mockResolvedValue(null);

		const response = await syncItemsFromReference('groups', getFromReference, vi.fn());

		expect(response.status).toBe(502);
		const body = await parseJson(response);
		expect(body.success).toBe(false);
	});

	it('returns 200 with per-instance statuses on success', async () => {
		const reference = makeInstance({ id: 1, name: 'Ref', isReference: true });
		const target = makeInstance({ id: 2, name: 'Target', isReference: false });
		getPiHoleInstancesMock.mockResolvedValue([reference, target]);
		checkAuthenticationMock.mockResolvedValue(PiHoleInstanceStatus.ACTIVE);

		const items = [{ name: 'group-a' }];
		const getFromReference = vi.fn().mockResolvedValue(items);
		const updateOne = vi.fn().mockResolvedValue(true);

		const response = await syncItemsFromReference('groups', getFromReference, updateOne);

		expect(response.status).toBe(200);
		const body = await parseJson(response);
		expect(body.success).toBe(true);
		expect(body.statuses).toHaveLength(1);
		expect(body.statuses[0].instance).toBe('Target');
		expect(body.statuses[0].success).toBe(true);
	});

	it('skips the reference instance during sync', async () => {
		const reference = makeInstance({ id: 1, name: 'Ref', isReference: true });
		const target = makeInstance({ id: 2, name: 'Target', isReference: false });
		getPiHoleInstancesMock.mockResolvedValue([reference, target]);
		checkAuthenticationMock.mockResolvedValue(PiHoleInstanceStatus.ACTIVE);

		const getFromReference = vi.fn().mockResolvedValue([{ name: 'g' }]);
		const updateOne = vi.fn().mockResolvedValue(true);

		await syncItemsFromReference('groups', getFromReference, updateOne);

		// updateOne must only be called for the non-reference target
		expect(updateOne).toHaveBeenCalledTimes(1);
		const [calledInstance] = updateOne.mock.calls[0];
		expect(calledInstance.id).toBe(2);
	});

	it('reports all statuses on partial failure', async () => {
		const reference = makeInstance({ id: 1, name: 'Ref', isReference: true });
		const ok = makeInstance({ id: 2, name: 'OK', isReference: false });
		const failing = makeInstance({ id: 3, name: 'Failing', isReference: false });
		getPiHoleInstancesMock.mockResolvedValue([reference, ok, failing]);
		checkAuthenticationMock.mockResolvedValue(PiHoleInstanceStatus.ACTIVE);

		const getFromReference = vi.fn().mockResolvedValue([{ name: 'g' }]);
		const updateOne = vi
			.fn()
			.mockImplementation((instance: PiHoleInstance) => Promise.resolve(instance.id === 2));

		const response = await syncItemsFromReference('groups', getFromReference, updateOne);

		expect(response.status).toBe(200);
		const body = await parseJson(response);
		expect(body.statuses).toHaveLength(2);
		const okStatus = body.statuses.find((s: { instance: string }) => s.instance === 'OK');
		const failStatus = body.statuses.find((s: { instance: string }) => s.instance === 'Failing');
		expect(okStatus.success).toBe(true);
		expect(failStatus.success).toBe(false);
	});

	it('syncItemsToInstance returns failure status when instance is not ACTIVE', async () => {
		const reference = makeInstance({ id: 1, name: 'Ref', isReference: true });
		const target = makeInstance({ id: 2, name: 'Target', isReference: false });
		getPiHoleInstancesMock.mockResolvedValue([reference, target]);
		// checkAuthentication returns UNAUTHORIZED for target
		checkAuthenticationMock.mockResolvedValue(PiHoleInstanceStatus.UNAUTHORIZED);

		const getFromReference = vi.fn().mockResolvedValue([{ name: 'g' }]);
		const updateOne = vi.fn();

		const response = await syncItemsFromReference('groups', getFromReference, updateOne);

		const body = await parseJson(response);
		expect(body.statuses[0].success).toBe(false);
		expect(body.statuses[0].message).toBe('Instance is not active');
		// updateOne must not be called for an inactive instance
		expect(updateOne).not.toHaveBeenCalled();
	});
});
