import type { Settings } from '$lib/types/types';
import settings from '../../../config.json';
const fs = await import('fs/promises');
const path = await import('path');

export async function getSettings(): Promise<Settings> {
	return settings as Settings;
}

export async function saveSettings(newSettings: Settings): Promise<boolean> {
	console.log('Saving settings:', newSettings);
	try {
		await fs.writeFile(
			path.join(process.cwd(), 'config.json'),
			JSON.stringify(newSettings, null, 2)
		);
		return true;
	} catch (error) {
		console.error('Error saving config.json:', error);
		return false;
	}
}
