import { describe, expect, it, vi } from 'vitest';
import { authenticate, checkAuthentication } from './pihole_client';
import { PiHoleInstanceStatus } from '$lib/types/types';
import type { PiHoleInstance } from '$lib/types/types';

// Mock file I/O — tests hit the real network but must not write to instances.json
vi.mock('$lib/models/pihole_instances', () => ({
	updatePiHoleInstanceCredentials: vi.fn().mockResolvedValue(undefined)
}));

// Factory functions ensure each test gets a fresh, unmutated instance object.
// authenticate() mutates the instance (sid, csrf, status) so sharing objects across
// tests would leak state.
const aliveInstance = (): PiHoleInstance => ({
	id: 2,
	name: 'Pi-hole Secondary',
	url: 'http://192.168.1.99:3380',
	apiKey: 'mB8TeA0X51HrgShL6tVTvRfEReNtdpS6sPUQY/C/Nv0=',
	isReference: false,
	sid: '',
	csrf: '',
	status: PiHoleInstanceStatus.UNREACHABLE
});

const deadInstance = (): PiHoleInstance => ({
	id: 3,
	name: 'Pi-hole Error',
	url: 'http://192.168.1.98:3380',
	apiKey: '1234',
	isReference: false,
	sid: '',
	csrf: '',
	status: PiHoleInstanceStatus.UNREACHABLE
});

describe('authenticate', () => {
	it('returns ACTIVE for the alive instance (.99)', async () => {
		const result = await authenticate(aliveInstance());
		expect(result).toBe(PiHoleInstanceStatus.ACTIVE);
	}, 10_000);

	it('returns UNREACHABLE for the dead instance (.98)', async () => {
		const result = await authenticate(deadInstance());
		expect(result).toBe(PiHoleInstanceStatus.UNREACHABLE);
	}, 5_000);
});

describe('checkAuthentication', () => {
	it('returns ACTIVE for the alive instance (.99)', async () => {
		// Empty sid triggers re-authentication internally
		const result = await checkAuthentication(aliveInstance());
		expect(result).toBe(PiHoleInstanceStatus.ACTIVE);
	}, 10_000);

	it('returns UNREACHABLE for the dead instance (.98)', async () => {
		const result = await checkAuthentication(deadInstance());
		expect(result).toBe(PiHoleInstanceStatus.UNREACHABLE);
	}, 10_000);
});
