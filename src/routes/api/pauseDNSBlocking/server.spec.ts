import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('$lib/models/pihole_instances', () => ({
	getPiHoleInstances: vi.fn()
}));

vi.mock('$lib/clients/pihole_client', () => ({
	pauseDNSBlocking: vi.fn()
}));

vi.mock('$lib/utils/logger', () => ({
	default: { error: vi.fn(), warn: vi.fn(), info: vi.fn() }
}));

import { POST } from './+server';
import { getPiHoleInstances } from '$lib/models/pihole_instances';
import { pauseDNSBlocking } from '$lib/clients/pihole_client';
import { PauseDurationTimeScale, PiHoleInstanceStatus } from '$lib/types/types';
import type { PiHoleInstance } from '$lib/types/types';

const mockedGetInstances = vi.mocked(getPiHoleInstances);
const mockedPause = vi.mocked(pauseDNSBlocking);

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

const VALID_BODY = {
	duration: 5,
	timeScale: PauseDurationTimeScale.MINUTES,
	instanceId: 1
};

describe('POST /api/pauseDNSBlocking', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockedPause.mockResolvedValue(true);
	});

	// ── validation ──────────────────────────────────────────────────────────

	it('returns 400 when request body is not valid JSON', async () => {
		const event = {
			request: { json: () => Promise.reject(new SyntaxError('bad json')) }
		};

		const response = await POST(event as never);

		expect(response.status).toBe(400);
	});

	it('returns 400 when duration is missing', async () => {
		mockedGetInstances.mockResolvedValue([makeInstance()]);
		const body = { timeScale: VALID_BODY.timeScale, instanceId: VALID_BODY.instanceId };
		const response = await POST(makeRequest(body) as never);

		expect(response.status).toBe(400);
		expect(mockedPause).not.toHaveBeenCalled();
	});

	it('returns 400 when duration is zero', async () => {
		mockedGetInstances.mockResolvedValue([makeInstance()]);
		const response = await POST(makeRequest({ ...VALID_BODY, duration: 0 }) as never);

		expect(response.status).toBe(400);
	});

	it('returns 400 when timeScale is missing', async () => {
		mockedGetInstances.mockResolvedValue([makeInstance()]);
		const body = { duration: VALID_BODY.duration, instanceId: VALID_BODY.instanceId };
		const response = await POST(makeRequest(body) as never);

		expect(response.status).toBe(400);
	});

	it('returns 400 when instanceId is missing', async () => {
		const body = { duration: VALID_BODY.duration, timeScale: VALID_BODY.timeScale };
		const response = await POST(makeRequest(body) as never);

		expect(response.status).toBe(400);
	});

	it('returns 404 when instanceId does not match any instance', async () => {
		mockedGetInstances.mockResolvedValue([makeInstance({ id: 1 })]);
		const response = await POST(makeRequest({ ...VALID_BODY, instanceId: 99 }) as never);

		expect(response.status).toBe(404);
	});

	// ── successful pause ────────────────────────────────────────────────────

	it('returns success ActionStatus when pauseDNSBlocking succeeds', async () => {
		mockedGetInstances.mockResolvedValue([makeInstance()]);

		const response = await POST(makeRequest(VALID_BODY) as never);

		expect(response.status).toBe(200);
		const body = await response.json();
		expect(body.success).toBe(true);
		expect(body.status.success).toBe(true);
	});

	// ── duration conversion ─────────────────────────────────────────────────

	it.each([
		[PauseDurationTimeScale.SECONDS, 30, 30],
		[PauseDurationTimeScale.MINUTES, 2, 120],
		[PauseDurationTimeScale.HOURS, 1, 3600],
		[PauseDurationTimeScale.DAYS, 1, 86400]
	])('converts %s duration %i to %i seconds', async (timeScale, duration, expectedSeconds) => {
		mockedGetInstances.mockResolvedValue([makeInstance()]);

		await POST(makeRequest({ duration, timeScale, instanceId: 1 }) as never);

		expect(mockedPause).toHaveBeenCalledWith(expect.anything(), expectedSeconds);
	});
});
