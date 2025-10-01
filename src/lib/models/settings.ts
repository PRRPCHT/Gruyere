import type { Settings } from '$lib/types/types';
const fs = await import('fs/promises');
const path = await import('path');

// Determine config directory - use /app/config in Docker, ./config in development
const configDir = process.env.NODE_ENV === 'production' ? '/app/config' : './config';

export async function getSettings(): Promise<Settings> {
	try {
		const filePath = path.join(configDir, 'config.json');
		const fileContent = await fs.readFile(filePath, 'utf-8');
		return JSON.parse(fileContent) as Settings;
	} catch (error) {
		console.error('Error reading config.json:', error);
		// Return default settings if file doesn't exist
		return {
			isRefreshInstance: true,
			instanceRefreshInterval: 30,
			synchronizeWithReference: 'partial'
		} as Settings;
	}
}

export async function saveSettings(newSettings: Settings): Promise<boolean> {
	console.log('Saving settings:', newSettings);
	try {
		await fs.writeFile(path.join(configDir, 'config.json'), JSON.stringify(newSettings, null, 2));
		return true;
	} catch (error) {
		console.error('Error saving config.json:', error);
		return false;
	}
}
