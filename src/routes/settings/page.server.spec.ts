import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('$lib/models/settings', () => ({
	getSettings: vi.fn(),
	saveSettings: vi.fn()
}));

vi.mock('$lib/models/password', () => ({
	savePassword: vi.fn()
}));

vi.mock('$lib/utils/logger', () => ({
	default: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() }
}));

import { load, actions } from './+page.server';
import { getSettings, saveSettings } from '$lib/models/settings';
import { savePassword } from '$lib/models/password';
import { SynchronizationMode } from '$lib/types/types';
import type { Settings } from '$lib/types/types';

const mockedGetSettings = vi.mocked(getSettings);
const mockedSaveSettings = vi.mocked(saveSettings);
const mockedSavePassword = vi.mocked(savePassword);

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

describe('settings/+page.server', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockedGetSettings.mockResolvedValue({ ...DEFAULT_SETTINGS });
		mockedSaveSettings.mockResolvedValue(true);
		mockedSavePassword.mockResolvedValue(undefined);
	});

	// ── load ──────────────────────────────────────────────────────────────────

	describe('load', () => {
		it('returns current settings', async () => {
			const result = await load();

			expect(result.settings).toEqual(DEFAULT_SETTINGS);
			expect(mockedGetSettings).toHaveBeenCalledOnce();
		});
	});

	// ── changeSettings ────────────────────────────────────────────────────────

	describe('actions.changeSettings', () => {
		const VALID_FIELDS = {
			isRefreshInstance: 'on',
			instanceRefreshInterval: '60',
			synchronizeWithReference: SynchronizationMode.COMPLETE
		};

		it('saves updated settings and returns success', async () => {
			const result = await actions.changeSettings(makeEvent(VALID_FIELDS) as never);

			expect(mockedSaveSettings).toHaveBeenCalledOnce();
			const saved = mockedSaveSettings.mock.calls[0][0] as Settings;
			expect(saved.isRefreshInstance).toBe(true);
			expect(saved.instanceRefreshInterval).toBe(60);
			expect(saved.synchronizeWithReference).toBe(SynchronizationMode.COMPLETE);
			expect(result).toMatchObject({ success: true, settingsSaved: true });
		});

		it('treats missing isRefreshInstance checkbox as false', async () => {
			const fields = {
				instanceRefreshInterval: '30',
				synchronizeWithReference: SynchronizationMode.PARTIAL
			};

			await actions.changeSettings(makeEvent(fields) as never);

			const saved = mockedSaveSettings.mock.calls[0][0] as Settings;
			expect(saved.isRefreshInstance).toBe(false);
		});

		it('returns 400 when instanceRefreshInterval is zero', async () => {
			const result = await actions.changeSettings(
				makeEvent({ ...VALID_FIELDS, instanceRefreshInterval: '0' }) as never
			);

			expect(result?.status).toBe(400);
			expect(mockedSaveSettings).not.toHaveBeenCalled();
		});

		it('returns 400 when instanceRefreshInterval is negative', async () => {
			const result = await actions.changeSettings(
				makeEvent({ ...VALID_FIELDS, instanceRefreshInterval: '-5' }) as never
			);

			expect(result?.status).toBe(400);
			expect(mockedSaveSettings).not.toHaveBeenCalled();
		});

		it('returns 400 when instanceRefreshInterval is not a number', async () => {
			const result = await actions.changeSettings(
				makeEvent({ ...VALID_FIELDS, instanceRefreshInterval: 'abc' }) as never
			);

			expect(result?.status).toBe(400);
			expect(mockedSaveSettings).not.toHaveBeenCalled();
		});

		it('returns 400 when synchronizeWithReference is missing', async () => {
			const fieldsWithout = {
				isRefreshInstance: VALID_FIELDS.isRefreshInstance,
				instanceRefreshInterval: VALID_FIELDS.instanceRefreshInterval
			};
			const result = await actions.changeSettings(makeEvent(fieldsWithout) as never);

			expect(result?.status).toBe(400);
			expect(mockedSaveSettings).not.toHaveBeenCalled();
		});

		it('returns the updated settings in the success response', async () => {
			const result = (await actions.changeSettings(makeEvent(VALID_FIELDS) as never)) as {
				settings: Settings;
			};

			expect(result.settings.instanceRefreshInterval).toBe(60);
			expect(result.settings.synchronizeWithReference).toBe(SynchronizationMode.COMPLETE);
		});
	});

	// ── changePassword ────────────────────────────────────────────────────────

	describe('actions.changePassword', () => {
		it('saves the new password and returns success for a valid password', async () => {
			const result = await actions.changePassword(makeEvent({ password: 'secure-pass' }) as never);

			expect(mockedSavePassword).toHaveBeenCalledWith('secure-pass');
			expect(result).toMatchObject({ success: true, passwordSaved: true });
		});

		it('accepts a password of exactly 6 characters', async () => {
			const result = await actions.changePassword(makeEvent({ password: 'abc123' }) as never);

			expect(result).toMatchObject({ success: true, passwordSaved: true });
		});

		it('returns 400 when password is shorter than 6 characters', async () => {
			const result = await actions.changePassword(makeEvent({ password: 'short' }) as never);

			expect(result?.status).toBe(400);
			expect(mockedSavePassword).not.toHaveBeenCalled();
		});

		it('returns 400 when password is empty', async () => {
			const result = await actions.changePassword(makeEvent({ password: '' }) as never);

			expect(result?.status).toBe(400);
			expect(mockedSavePassword).not.toHaveBeenCalled();
		});

		it('returns 400 when password field is absent', async () => {
			const result = await actions.changePassword(makeEvent({}) as never);

			expect(result?.status).toBe(400);
			expect(mockedSavePassword).not.toHaveBeenCalled();
		});
	});
});
