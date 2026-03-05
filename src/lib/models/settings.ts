import type { Settings } from '$lib/types/types';
import { atomicWriteFile } from '$lib/utils/fs';
import { configDir } from './config';
import { SettingsSchema } from '$lib/types/schemas';
import logger from '$lib/utils/logger';

const fs = await import('fs/promises');
const path = await import('path');

export async function getSettings(): Promise<Settings> {
	try {
		const filePath = path.join(configDir, 'config.json');
		const fileContent = await fs.readFile(filePath, 'utf-8');
		return SettingsSchema.parse(JSON.parse(fileContent));
	} catch (error) {
		logger.error({ error }, 'Error reading config.json');
		// Return default settings if file doesn't exist
		return {
			isRefreshInstance: true,
			instanceRefreshInterval: 30,
			synchronizeWithReference: 'partial'
		} as Settings;
	}
}

export async function saveSettings(newSettings: Settings): Promise<boolean> {
	logger.info({ settings: newSettings }, 'Saving settings');
	try {
		await atomicWriteFile(
			path.join(configDir, 'config.json'),
			JSON.stringify(newSettings, null, 2)
		);
		return true;
	} catch (error) {
		logger.error({ error }, 'Error saving config.json');
		return false;
	}
}
