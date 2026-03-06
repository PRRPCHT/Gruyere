import { describe, expect, it } from 'vitest';
import {
	toClientInstance,
	toClientInstances,
	PiHoleInstances,
	PiHoleInstanceStatus
} from './types';
import type { PiHoleInstance } from './types';

function makeInstance(overrides: Partial<PiHoleInstance> = {}): PiHoleInstance {
	return {
		id: 1,
		name: 'Pi-hole 1',
		url: 'http://192.168.1.1:80',
		apiKey: 'secret-key',
		isReference: false,
		sid: 'session-id',
		csrf: 'csrf-token',
		status: PiHoleInstanceStatus.ACTIVE,
		...overrides
	};
}

describe('toClientInstance', () => {
	it('strips sid, csrf, and apiKey from output', () => {
		const instance = makeInstance();
		const client = toClientInstance(instance);

		expect(client).not.toHaveProperty('sid');
		expect(client).not.toHaveProperty('csrf');
		expect(client).not.toHaveProperty('apiKey');
	});

	it('preserves the remaining fields', () => {
		const instance = makeInstance({ id: 42, name: 'Main', isReference: true });
		const client = toClientInstance(instance);

		expect(client).toEqual({
			id: 42,
			name: 'Main',
			url: 'http://192.168.1.1:80',
			isReference: true,
			status: PiHoleInstanceStatus.ACTIVE
		});
	});
});

describe('toClientInstances', () => {
	it('correctly maps an array of instances', () => {
		const instances = [
			makeInstance({ id: 1, name: 'A' }),
			makeInstance({ id: 2, name: 'B', url: 'http://192.168.1.2:80' })
		];
		const clients = toClientInstances(instances);

		expect(clients).toHaveLength(2);
		expect(clients[0].id).toBe(1);
		expect(clients[1].id).toBe(2);
		clients.forEach((c) => {
			expect(c).not.toHaveProperty('sid');
			expect(c).not.toHaveProperty('csrf');
			expect(c).not.toHaveProperty('apiKey');
		});
	});

	it('returns an empty array for empty input', () => {
		expect(toClientInstances([])).toEqual([]);
	});
});

describe('PiHoleInstances', () => {
	describe('getNextId', () => {
		it('returns max(id) + 1', () => {
			const store = new PiHoleInstances([
				makeInstance({ id: 3 }),
				makeInstance({ id: 7 }),
				makeInstance({ id: 5 })
			]);

			expect(store.getNextId()).toBe(8);
		});

		it('returns 1 for empty instances', () => {
			expect(new PiHoleInstances([]).getNextId()).toBe(1);
		});
	});

	describe('addInstance', () => {
		it('appends the new instance to the list', () => {
			const store = new PiHoleInstances([makeInstance({ id: 1 })]);
			const newInstance = makeInstance({ id: 2, name: 'Second' });

			store.addInstance(newInstance);

			expect(store.instances).toHaveLength(2);
			expect(store.instances[1]).toBe(newInstance);
		});

		it('works on an initially empty store', () => {
			const store = new PiHoleInstances([]);
			const instance = makeInstance({ id: 1 });

			store.addInstance(instance);

			expect(store.instances).toHaveLength(1);
			expect(store.instances[0]).toBe(instance);
		});
	});
});
