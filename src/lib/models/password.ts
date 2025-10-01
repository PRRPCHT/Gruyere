const fs = await import('fs/promises');
const path = await import('path');

// Determine config directory - use /app/config in Docker, ./config in development
const configDir = process.env.NODE_ENV === 'production' ? '/app/config' : './config';

export async function getPassword(): Promise<string> {
	try {
		const filePath = path.join(configDir, 'password.json');
		const fileContent = await fs.readFile(filePath, 'utf-8');
		const passwordData = JSON.parse(fileContent);
		return passwordData.password as string;
	} catch (error) {
		console.error('Error reading password.json:', error);
		// Return default password if file doesn't exist
		return 'admin';
	}
}

export async function savePassword(newPassword: string): Promise<boolean> {
	try {
		await fs.writeFile(
			path.join(configDir, 'password.json'),
			JSON.stringify({ password: newPassword }, null, 2)
		);
		return true;
	} catch (error) {
		console.error('Error saving password.json:', error);
		return false;
	}
}
