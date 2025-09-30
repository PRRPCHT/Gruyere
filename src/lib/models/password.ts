import password from '../../../password.json';
const fs = await import('fs/promises');
const path = await import('path');

export async function getPassword(): Promise<string> {
	return password.password as string;
}

export async function savePassword(newPassword: string): Promise<boolean> {
	try {
		await fs.writeFile(
			path.join(process.cwd(), 'password.json'),
			JSON.stringify({ password: newPassword }, null, 2)
		);
		return true;
	} catch (error) {
		console.error('Error saving password.json:', error);
		return false;
	}
}
