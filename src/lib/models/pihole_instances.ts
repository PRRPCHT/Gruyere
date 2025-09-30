import { authenticate } from '$lib/clients/pihole_client';
import { PiHoleInstanceStatus, type PiHoleInstance } from '$lib/types/types';

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

export async function deletePiHoleInstance(id: number): Promise<PiHoleInstance[]> {
	try {
		const instances = await getPiHoleInstances();
		const toDelete = instances.find((instance) => instance.id === id);
		const newInstances = instances.filter((instance) => instance.id !== id);
		if (toDelete?.isReference && newInstances.length >= 1) {
			newInstances[0].isReference = true;
		}
		await savePiHoleInstances(newInstances);
		return newInstances;
	} catch (error) {
		console.error('Error deleting instance:', error);
		return [];
	}
}

export async function editPiHoleInstance(
	id: number,
	name: string,
	url: string,
	apiKey: string,
	isReference: boolean
): Promise<PiHoleInstance[]> {
	try {
		const instances = await getPiHoleInstances();
		const preInstance = instances.find((instance) => instance.id === id);
		if (!preInstance) {
			throw new Error('Instance not found');
		}
		let newInstances: PiHoleInstance[] = instances.map((instance) =>
			instance.id === id ? { ...instance, name, url, apiKey, isReference } : instance
		);
		if (preInstance.url !== url || preInstance.apiKey !== apiKey) {
			preInstance.url = url;
			preInstance.apiKey = apiKey;
			await authenticate(preInstance);
			newInstances = newInstances.map((instance) =>
				instance.id === id ? { ...instance, status: preInstance.status } : instance
			);
		}
		if (preInstance.isReference !== isReference) {
			preInstance.isReference = isReference;
			if (isReference) {
				newInstances = newInstances.map((instance) =>
					instance.id === id
						? { ...instance, isReference: true }
						: { ...instance, isReference: false }
				);
			} else {
				newInstances = newInstances.map((instance) =>
					instance.id === id
						? { ...instance, isReference: false }
						: { ...instance, isReference: false }
				);
				if (newInstances.length >= 1 && newInstances[0].id != id) {
					newInstances[0].isReference = true;
				} else {
					newInstances[1].isReference = true;
				}
			}
		}
		await savePiHoleInstances(newInstances);
		return newInstances;
	} catch (error) {
		console.error('Error editing instance:', error);
		return [];
	}
}

export async function updatePiHoleInstanceCredentials(instance: PiHoleInstance) {
	try {
		const instances = await getPiHoleInstances();
		if (!instances.find((instance) => instance.id === instance.id)) {
			throw new Error('Instance not found');
		}
		const newInstances = instances.map((toEdit) =>
			toEdit.id === instance.id
				? { ...toEdit, status: instance.status, sid: instance.sid, csrf: instance.csrf }
				: toEdit
		);
		await savePiHoleInstances(newInstances);
	} catch (error) {
		console.error('Error updating instance credentials:', error);
	}
}
