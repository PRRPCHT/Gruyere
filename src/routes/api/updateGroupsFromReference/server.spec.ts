import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('$lib/server/sync', () => ({
	syncItemsFromReference: vi.fn()
}));

vi.mock('$lib/clients/pihole_client', () => ({
	getGroupsFromReference: vi.fn(),
	updateGroupForInstance: vi.fn()
}));

import { POST } from './+server';
import { syncItemsFromReference } from '$lib/server/sync';
import { getGroupsFromReference, updateGroupForInstance } from '$lib/clients/pihole_client';

const mockedSync = vi.mocked(syncItemsFromReference);

describe('POST /api/updateGroupsFromReference', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('delegates to syncItemsFromReference with the groups getter and updater', async () => {
		mockedSync.mockResolvedValue(new Response(null, { status: 200 }));

		await POST({} as never);

		expect(mockedSync).toHaveBeenCalledOnce();
		expect(mockedSync).toHaveBeenCalledWith(
			'groups',
			getGroupsFromReference,
			updateGroupForInstance
		);
	});

	it('returns 400 when syncItemsFromReference reports no reference instance', async () => {
		mockedSync.mockResolvedValue(new Response(JSON.stringify({ success: false }), { status: 400 }));

		const response = await POST({} as never);

		expect(response.status).toBe(400);
	});

	it('returns 200 with per-instance statuses on success', async () => {
		const statuses = [
			{ success: true, instance: 'Pi-hole 1', message: 'ok', instanceStatus: 'active' }
		];
		mockedSync.mockResolvedValue(
			new Response(JSON.stringify({ success: true, statuses }), { status: 200 })
		);

		const response = await POST({} as never);

		expect(response.status).toBe(200);
		const body = await response.json();
		expect(body.statuses).toEqual(statuses);
	});
});
