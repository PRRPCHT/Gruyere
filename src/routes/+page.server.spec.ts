import { describe, it, expect, vi, beforeEach } from 'vitest';

// vi.mock calls are hoisted before imports, so these run first
vi.mock('$lib/clients/pihole_client', () => ({
	authenticate: vi.fn()
}));

vi.mock('$lib/models/pihole_instances', () => ({
	deletePiHoleInstance: vi.fn(),
	editPiHoleInstance: vi.fn(),
	getNextId: vi.fn(),
	getPiHoleInstances: vi.fn(),
	savePiHoleInstances: vi.fn()
}));

vi.mock('$lib/models/settings', () => ({
	getSettings: vi.fn()
}));

vi.mock('$lib/utils/logger', () => ({
	default: { error: vi.fn(), warn: vi.fn(), info: vi.fn() }
}));

import { load, actions } from './+page.server';
import { authenticate } from '$lib/clients/pihole_client';
import {
	deletePiHoleInstance as deleteInstanceModel,
	editPiHoleInstance as editInstanceModel,
	getNextId,
	getPiHoleInstances,
	savePiHoleInstances
} from '$lib/models/pihole_instances';
import { getSettings } from '$lib/models/settings';
import { PiHoleInstanceStatus, SynchronizationMode } from '$lib/types/types';
import type { PiHoleInstance, Settings } from '$lib/types/types';

const mockedAuthenticate = vi.mocked(authenticate);
const mockedDeleteInstance = vi.mocked(deleteInstanceModel);
const mockedEditInstance = vi.mocked(editInstanceModel);
const mockedGetNextId = vi.mocked(getNextId);
const mockedGetInstances = vi.mocked(getPiHoleInstances);
const mockedSaveInstances = vi.mocked(savePiHoleInstances);
const mockedGetSettings = vi.mocked(getSettings);

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

const DEFAULT_SETTINGS: Settings = {
	isRefreshInstance: true,
	instanceRefreshInterval: 30,
	synchronizeWithReference: SynchronizationMode.PARTIAL
};

function makeFormData(fields: Record<string, string>): FormData {
	const fd = new FormData();
	for (const [key, value] of Object.entries(fields)) {
		fd.set(key, value);
	}
	return fd;
}

function makeEvent(fields: Record<string, string>) {
	return {
		request: {
			formData: () => Promise.resolve(makeFormData(fields))
		} as unknown as Request
	};
}

describe('+page.server', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockedSaveInstances.mockResolvedValue(undefined);
		mockedAuthenticate.mockResolvedValue(undefined);
	});

	// ── load ─────────────────────────────────────────────────────────────────

	describe('load', () => {
		it('returns instances and settings', async () => {
			const instance = makeInstance({ isReference: true });
			mockedGetInstances.mockResolvedValue([instance]);
			mockedGetSettings.mockResolvedValue(DEFAULT_SETTINGS);

			const result = await load();

			expect(result.instances).toHaveLength(1);
			expect(result.settings).toEqual(DEFAULT_SETTINGS);
		});

		it('strips secrets from returned instances', async () => {
			mockedGetInstances.mockResolvedValue([makeInstance()]);
			mockedGetSettings.mockResolvedValue(DEFAULT_SETTINGS);

			const result = await load();
			const instance = result.instances[0];

			expect(instance).not.toHaveProperty('sid');
			expect(instance).not.toHaveProperty('csrf');
			expect(instance).not.toHaveProperty('apiKey');
		});
	});

	// ── addPiHoleInstance ─────────────────────────────────────────────────────

	describe('actions.addPiHoleInstance', () => {
		describe('validation failures', () => {
			it('returns 400 when name is missing', async () => {
				const result = await actions.addPiHoleInstance(
					makeEvent({ url: 'http://192.168.1.2:80', apiKey: 'key' }) as never
				);
				expect(result?.status).toBe(400);
			});

			it('returns 400 when url is missing', async () => {
				const result = await actions.addPiHoleInstance(
					makeEvent({ name: 'My Pi-hole', apiKey: 'key' }) as never
				);
				expect(result?.status).toBe(400);
			});

			it('returns 400 when apiKey is missing', async () => {
				const result = await actions.addPiHoleInstance(
					makeEvent({ name: 'My Pi-hole', url: 'http://192.168.1.2:80' }) as never
				);
				expect(result?.status).toBe(400);
			});

			it('does not touch the instance list on validation failure', async () => {
				await actions.addPiHoleInstance(makeEvent({ name: 'My Pi-hole' }) as never);
				expect(mockedGetInstances).not.toHaveBeenCalled();
				expect(mockedSaveInstances).not.toHaveBeenCalled();
			});
		});

		describe('successful add', () => {
			const VALID_FIELDS = {
				name: 'New Pi-hole',
				url: 'http://192.168.1.2:80',
				apiKey: 'my-api-key'
			};

			beforeEach(() => {
				mockedGetNextId.mockReturnValue(2);
			});

			it('sets isReference true when adding the first instance', async () => {
				mockedGetInstances.mockResolvedValue([]);

				await actions.addPiHoleInstance(makeEvent(VALID_FIELDS) as never);

				const saved = mockedSaveInstances.mock.calls[0][0];
				expect(saved[0].isReference).toBe(true);
			});

			it('sets isReference false when other instances already exist', async () => {
				mockedGetInstances.mockResolvedValue([makeInstance({ id: 1, isReference: true })]);

				await actions.addPiHoleInstance(makeEvent(VALID_FIELDS) as never);

				const saved = mockedSaveInstances.mock.calls[0][0];
				const newInstance = saved.find((i: PiHoleInstance) => i.id === 2);
				expect(newInstance?.isReference).toBe(false);
			});

			it('calls authenticate on the new instance', async () => {
				mockedGetInstances.mockResolvedValue([]);

				await actions.addPiHoleInstance(makeEvent(VALID_FIELDS) as never);

				expect(mockedAuthenticate).toHaveBeenCalledOnce();
				const authenticatedInstance = mockedAuthenticate.mock.calls[0][0] as PiHoleInstance;
				expect(authenticatedInstance.name).toBe('New Pi-hole');
			});

			it('returns success with client-safe instances', async () => {
				mockedGetInstances.mockResolvedValue([]);

				const result = await actions.addPiHoleInstance(makeEvent(VALID_FIELDS) as never);

				expect(result).toMatchObject({ success: true });
				expect((result as { instances: unknown[] }).instances[0]).not.toHaveProperty('apiKey');
			});
		});
	});

	// ── editPiHoleInstance ────────────────────────────────────────────────────

	describe('actions.editPiHoleInstance', () => {
		describe('validation failures', () => {
			it('returns 400 when id is missing', async () => {
				const result = await actions.editPiHoleInstance(
					makeEvent({ name: 'Updated', url: 'http://192.168.1.1:80' }) as never
				);
				expect(result?.status).toBe(400);
			});

			it('returns 400 when name is missing', async () => {
				const result = await actions.editPiHoleInstance(
					makeEvent({ id: '1', url: 'http://192.168.1.1:80' }) as never
				);
				expect(result?.status).toBe(400);
			});

			it('returns 400 when url is missing', async () => {
				const result = await actions.editPiHoleInstance(
					makeEvent({ id: '1', name: 'Updated' }) as never
				);
				expect(result?.status).toBe(400);
			});
		});

		describe('successful edit', () => {
			const VALID_FIELDS = {
				id: '1',
				name: 'Updated Name',
				url: 'http://192.168.1.1:80',
				isReference: 'true'
			};

			it('calls editPiHoleInstance model with parsed id and fields', async () => {
				mockedEditInstance.mockResolvedValue([makeInstance()]);

				await actions.editPiHoleInstance(makeEvent(VALID_FIELDS) as never);

				expect(mockedEditInstance).toHaveBeenCalledWith(
					1,
					'Updated Name',
					'http://192.168.1.1:80',
					undefined,
					true
				);
			});

			it('returns success with client-safe instances', async () => {
				mockedEditInstance.mockResolvedValue([makeInstance()]);

				const result = await actions.editPiHoleInstance(makeEvent(VALID_FIELDS) as never);

				expect(result).toMatchObject({ success: true });
				expect((result as { instances: unknown[] }).instances[0]).not.toHaveProperty('apiKey');
			});
		});
	});

	// ── deletePiHoleInstance ──────────────────────────────────────────────────

	describe('actions.deletePiHoleInstance', () => {
		describe('validation failures', () => {
			it('returns 400 when id is missing', async () => {
				const result = await actions.deletePiHoleInstance(makeEvent({}) as never);
				expect(result?.status).toBe(400);
			});
		});

		describe('successful delete', () => {
			it('calls deletePiHoleInstance model with parsed id', async () => {
				mockedDeleteInstance.mockResolvedValue([]);

				await actions.deletePiHoleInstance(makeEvent({ id: '3' }) as never);

				expect(mockedDeleteInstance).toHaveBeenCalledWith(3);
			});

			it('returns success with the updated instance list', async () => {
				mockedDeleteInstance.mockResolvedValue([makeInstance({ id: 1, isReference: true })]);

				const result = await actions.deletePiHoleInstance(makeEvent({ id: '2' }) as never);

				expect(result).toMatchObject({ success: true });
				expect((result as { instances: unknown[] }).instances).toHaveLength(1);
			});
		});
	});
});
