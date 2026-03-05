import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { mkdtemp, rm } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { PiHoleInstanceStatus } from '$lib/types/types';
import type { PiHoleInstance } from '$lib/types/types';

vi.mock('$lib/utils/logger', () => ({
	default: { error: vi.fn(), warn: vi.fn(), info: vi.fn() }
}));

const authenticateMock = vi.fn().mockResolvedValue(undefined);
vi.mock('$lib/clients/pihole_client', () => ({
	authenticate: (...args: unknown[]) => authenticateMock(...args)
}));

let tempDir: string;

beforeEach(async () => {
	tempDir = await mkdtemp(join(tmpdir(), 'gruyere-inst-'));
	vi.stubEnv('CONFIG_DIR', tempDir);
	authenticateMock.mockClear();
});

afterEach(async () => {
	vi.unstubAllEnvs();
	await rm(tempDir, { recursive: true, force: true });
});

async function loadModules() {
	vi.resetModules();
	return await import('./pihole_instances');
}

function makeInstance(overrides: Partial<PiHoleInstance> = {}): PiHoleInstance {
	return {
		id: 1,
		name: 'Pi-hole 1',
		url: 'http://192.168.1.1:80',
		apiKey: 'key1',
		isReference: false,
		sid: '',
		csrf: '',
		status: PiHoleInstanceStatus.ACTIVE,
		...overrides
	};
}

describe('savePiHoleInstances + getPiHoleInstances', () => {
	it('round-trips instances correctly', async () => {
		const { savePiHoleInstances, getPiHoleInstances } = await loadModules();
		const instances = [
			makeInstance({ id: 1, name: 'A', isReference: true }),
			makeInstance({ id: 2, name: 'B', url: 'http://192.168.1.2:80', apiKey: 'key2' })
		];

		await savePiHoleInstances(instances);
		const loaded = await getPiHoleInstances();

		expect(loaded).toEqual(instances);
	});
});

describe('getPiHoleInstances', () => {
	it('returns empty array when file is missing', async () => {
		const { getPiHoleInstances } = await loadModules();

		expect(await getPiHoleInstances()).toEqual([]);
	});
});

describe('getNextId', () => {
	it('returns max(id) + 1', async () => {
		const { getNextId } = await loadModules();
		const instances = [makeInstance({ id: 3 }), makeInstance({ id: 7 }), makeInstance({ id: 5 })];

		expect(getNextId(instances)).toBe(8);
	});

	it('returns 1 for empty array', async () => {
		const { getNextId } = await loadModules();

		expect(getNextId([])).toBe(1);
	});
});

describe('deletePiHoleInstance', () => {
	it('promotes first remaining instance to reference when reference is deleted', async () => {
		const { savePiHoleInstances, deletePiHoleInstance } = await loadModules();
		const instances = [
			makeInstance({ id: 1, name: 'Ref', isReference: true }),
			makeInstance({ id: 2, name: 'Second', url: 'http://192.168.1.2:80' }),
			makeInstance({ id: 3, name: 'Third', url: 'http://192.168.1.3:80' })
		];
		await savePiHoleInstances(instances);

		const result = await deletePiHoleInstance(1);

		expect(result).toHaveLength(2);
		expect(result[0].id).toBe(2);
		expect(result[0].isReference).toBe(true);
		expect(result[1].isReference).toBe(false);
	});

	it('does not promote when a non-reference instance is deleted', async () => {
		const { savePiHoleInstances, deletePiHoleInstance } = await loadModules();
		const instances = [
			makeInstance({ id: 1, name: 'Ref', isReference: true }),
			makeInstance({ id: 2, name: 'Other', url: 'http://192.168.1.2:80' })
		];
		await savePiHoleInstances(instances);

		const result = await deletePiHoleInstance(2);

		expect(result).toHaveLength(1);
		expect(result[0].id).toBe(1);
		expect(result[0].isReference).toBe(true);
	});

	it('returns empty array without error when last instance is deleted', async () => {
		const { savePiHoleInstances, deletePiHoleInstance } = await loadModules();
		await savePiHoleInstances([makeInstance({ id: 1, isReference: true })]);

		const result = await deletePiHoleInstance(1);

		expect(result).toEqual([]);
	});
});

describe('editPiHoleInstance', () => {
	it('sets other instances isReference to false when promoting a new reference', async () => {
		const { savePiHoleInstances, editPiHoleInstance } = await loadModules();
		const instances = [
			makeInstance({ id: 1, name: 'Ref', isReference: true }),
			makeInstance({ id: 2, name: 'Other', url: 'http://192.168.1.2:80', apiKey: 'key2' })
		];
		await savePiHoleInstances(instances);

		const result = await editPiHoleInstance(2, 'Other', 'http://192.168.1.2:80', undefined, true);

		expect(result.find((i) => i.id === 2)!.isReference).toBe(true);
		expect(result.find((i) => i.id === 1)!.isReference).toBe(false);
	});

	it('triggers re-authentication when URL changes', async () => {
		const { savePiHoleInstances, editPiHoleInstance } = await loadModules();
		await savePiHoleInstances([makeInstance({ id: 1, isReference: true })]);

		await editPiHoleInstance(1, 'Pi-hole 1', 'http://10.0.0.1:80', undefined, true);

		expect(authenticateMock).toHaveBeenCalledOnce();
	});

	it('triggers re-authentication when API key changes', async () => {
		const { savePiHoleInstances, editPiHoleInstance } = await loadModules();
		await savePiHoleInstances([makeInstance({ id: 1, isReference: true })]);

		await editPiHoleInstance(1, 'Pi-hole 1', 'http://192.168.1.1:80', 'new-key', true);

		expect(authenticateMock).toHaveBeenCalledOnce();
	});

	it('does not re-authenticate when URL and API key are unchanged', async () => {
		const { savePiHoleInstances, editPiHoleInstance } = await loadModules();
		await savePiHoleInstances([makeInstance({ id: 1, isReference: true })]);

		await editPiHoleInstance(1, 'Renamed', 'http://192.168.1.1:80', undefined, true);

		expect(authenticateMock).not.toHaveBeenCalled();
	});

	it('throws when instance is not found', async () => {
		const { savePiHoleInstances, editPiHoleInstance } = await loadModules();
		await savePiHoleInstances([makeInstance({ id: 1 })]);

		await expect(
			editPiHoleInstance(999, 'Ghost', 'http://nowhere:80', undefined, false)
		).rejects.toThrow('Instance not found');
	});
});

describe('updatePiHoleInstanceCredentials', () => {
	it('updates sid/csrf/status for a matching instance', async () => {
		const { savePiHoleInstances, getPiHoleInstances, updatePiHoleInstanceCredentials } =
			await loadModules();
		await savePiHoleInstances([makeInstance({ id: 1, isReference: true })]);

		const updated = makeInstance({
			id: 1,
			sid: 'new-sid',
			csrf: 'new-csrf',
			status: PiHoleInstanceStatus.UNAUTHORIZED
		});
		await updatePiHoleInstanceCredentials(updated);

		const instances = await getPiHoleInstances();
		expect(instances[0].sid).toBe('new-sid');
		expect(instances[0].csrf).toBe('new-csrf');
		expect(instances[0].status).toBe(PiHoleInstanceStatus.UNAUTHORIZED);
	});

	it('silently handles missing instance (no throw)', async () => {
		const { savePiHoleInstances, updatePiHoleInstanceCredentials } = await loadModules();
		await savePiHoleInstances([makeInstance({ id: 1 })]);

		const ghost = makeInstance({ id: 999, sid: 'x', csrf: 'y' });
		await expect(updatePiHoleInstanceCredentials(ghost)).resolves.not.toThrow();
	});
});

describe('withInstancesLock (concurrency)', () => {
	it('serializes concurrent calls correctly', async () => {
		const { savePiHoleInstances, deletePiHoleInstance } = await loadModules();
		const instances = [
			makeInstance({ id: 1, name: 'A', isReference: true }),
			makeInstance({ id: 2, name: 'B', url: 'http://192.168.1.2:80' }),
			makeInstance({ id: 3, name: 'C', url: 'http://192.168.1.3:80' })
		];
		await savePiHoleInstances(instances);

		// Fire two deletes concurrently
		const [r1, r2] = await Promise.all([deletePiHoleInstance(2), deletePiHoleInstance(3)]);

		// One of them sees 3 instances and removes one (leaving 2),
		// the other sees 2 instances and removes another (leaving 1).
		// The final result should have exactly 1 instance.
		const lastResult = r2.length < r1.length ? r2 : r1;
		expect(lastResult).toHaveLength(1);
		expect(lastResult[0].id).toBe(1);
		expect(lastResult[0].isReference).toBe(true);
	});
});
