import { type PiHoleInstance } from '$lib/types/types';

const fs = await import('fs/promises');
const path = await import('path');

export async function getPiHoleInstances(): Promise<PiHoleInstance[]> {
	try {
		const filePath = path.join(process.cwd(), 'instances.json');
		const fileContent = await fs.readFile(filePath, 'utf-8');
		return JSON.parse(fileContent);
	} catch (error) {
		console.error('Error reading instances.json:', error);
		return [];
	}
}

export async function savePiHoleInstances(instances: PiHoleInstance[]): Promise<boolean> {
	try {
		const filePath = path.join(process.cwd(), 'instances.json');
		await fs.writeFile(filePath, JSON.stringify(instances, null, 2));
		return true;
	} catch (error) {
		console.error('Error saving instances.json:', error);
		return false;
	}
}

export function getNextId(instances: PiHoleInstance[]): number {
	return instances.reduce((max, instance) => Math.max(max, instance.id), 0) + 1;
}
