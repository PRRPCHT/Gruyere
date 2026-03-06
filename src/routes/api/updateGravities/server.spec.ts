import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('$lib/models/pihole_instances', () => ({
	getPiHoleInstances: vi.fn()
}));

vi.mock('$lib/clients/pihole_client', () => ({
	updateGravity: vi.fn()
}));

vi.mock('$lib/utils/logger', () => ({
	default: { error: vi.fn(), warn: vi.fn(), info: vi.fn() }
}));

import { POST } from './+server';
import { getPiHoleInstances } from '$lib/models/pihole_instances';
import { updateGravity } from '$lib/clients/pihole_client';
import { PiHoleInstanceStatus } from '$lib/types/types';
import type { PiHoleInstance } from '$lib/types/types';

const mockedGetInstances = vi.mocked(getPiHoleInstances);
const mockedUpdateGravity = vi.mocked(updateGravity);

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

function makeRequest(body: Record<string, unknown>) {
	return {
		request: { json: () => Promise.resolve(body) }
	};
}

describe('POST /api/updateGravities', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockedUpdateGravity.mockResolvedValue(true);
	});

	it('returns 400 when request body is not valid JSON', async () => {
		const event = {
			request: { json: () => Promise.reject(new SyntaxError('bad json')) }
		};

		const response = await POST(event as never);

		expect(response.status).toBe(400);
	});

	it('returns 400 when instanceId is missing', async () => {
		const response = await POST(makeRequest({}) as never);

		expect(response.status).toBe(400);
		expect(mockedUpdateGravity).not.toHaveBeenCalled();
	});

	it('returns 404 when instanceId does not match any instance', async () => {
		mockedGetInstances.mockResolvedValue([makeInstance({ id: 1 })]);

		const response = await POST(makeRequest({ instanceId: 99 }) as never);

		expect(response.status).toBe(404);
	});

	it('returns success ActionStatus when updateGravity succeeds', async () => {
		mockedGetInstances.mockResolvedValue([makeInstance()]);

		const response = await POST(makeRequest({ instanceId: 1 }) as never);

		expect(response.status).toBe(200);
		const body = await response.json();
		expect(body.success).toBe(true);
		expect(body.status.success).toBe(true);
	});

	it('calls updateGravity with the matched instance', async () => {
		const instance = makeInstance();
		mockedGetInstances.mockResolvedValue([instance]);

		await POST(makeRequest({ instanceId: 1 }) as never);

		expect(mockedUpdateGravity).toHaveBeenCalledWith(instance);
	});
});
