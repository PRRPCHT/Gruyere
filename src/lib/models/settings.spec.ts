import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { mkdtemp, rm, writeFile } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { SynchronizationMode } from '$lib/types/types';
import type { Settings } from '$lib/types/types';

vi.mock('$lib/utils/logger', () => ({
	default: { error: vi.fn(), warn: vi.fn(), info: vi.fn() }
}));

let tempDir: string;

beforeEach(async () => {
	tempDir = await mkdtemp(join(tmpdir(), 'gruyere-settings-'));
	vi.stubEnv('CONFIG_DIR', tempDir);
});

afterEach(async () => {
	vi.unstubAllEnvs();
	await rm(tempDir, { recursive: true, force: true });
});

async function loadModules() {
	vi.resetModules();
	return await import('./settings');
}

const validSettings: Settings = {
	isRefreshInstance: true,
	instanceRefreshInterval: 60,
	synchronizeWithReference: SynchronizationMode.COMPLETE
};

describe('saveSettings + getSettings', () => {
	it('round-trips settings correctly', async () => {
		const { saveSettings, getSettings } = await loadModules();

		await saveSettings(validSettings);
		const loaded = await getSettings();

		expect(loaded).toEqual(validSettings);
	});
});

describe('getSettings', () => {
	it('returns default values when file is missing', async () => {
		const { getSettings } = await loadModules();

		const settings = await getSettings();

		expect(settings).toEqual({
			isRefreshInstance: true,
			instanceRefreshInterval: 30,
			synchronizeWithReference: 'partial'
		});
	});

	it('returns defaults when file contains invalid JSON', async () => {
		const { getSettings } = await loadModules();

		await writeFile(join(tempDir, 'config.json'), '%%%not-json%%%');
		const settings = await getSettings();

		expect(settings.instanceRefreshInterval).toBe(30);
		expect(settings.synchronizeWithReference).toBe('partial');
	});
});
