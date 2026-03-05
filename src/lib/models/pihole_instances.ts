import { authenticate } from '$lib/clients/pihole_client';
import type { PiHoleInstance } from '$lib/types/types';
import { atomicWriteFile } from '$lib/utils/fs';
import { configDir } from './config';
import logger from '$lib/utils/logger';

const fs = await import('fs/promises');
const path = await import('path');

// Promise-chain mutex to serialize read-modify-write operations on instances.json.
// Prevents concurrent writes from overwriting each other's changes.
let instancesLock: Promise<void> = Promise.resolve();

// Acquire the mutex and run a callback that performs read-modify-write operations.
// @param fn - The callback to run while holding the lock
// @returns the value returned by the callback
async function withInstancesLock<T>(fn: () => Promise<T>): Promise<T> {
	let release: () => void;
	const next = new Promise<void>((resolve) => {
		release = resolve;
	});
	const prev = instancesLock;
	instancesLock = next;
	await prev;
	try {
		return await fn();
	} finally {
		release!();
	}
}

export async function getPiHoleInstances(): Promise<PiHoleInstance[]> {
	try {
		const filePath = path.join(configDir, 'instances.json');
		const fileContent = await fs.readFile(filePath, 'utf-8');
		return JSON.parse(fileContent);
	} catch (error) {
		logger.error({ error }, 'Error reading instances.json');
		return [];
	}
}

export async function savePiHoleInstances(instances: PiHoleInstance[]): Promise<boolean> {
	try {
		const filePath = path.join(configDir, 'instances.json');
		await atomicWriteFile(filePath, JSON.stringify(instances, null, 2));
		return true;
	} catch (error) {
		logger.error({ error }, 'Error saving instances.json');
		return false;
	}
}

export function getNextId(instances: PiHoleInstance[]): number {
	return instances.reduce((max, instance) => Math.max(max, instance.id), 0) + 1;
}

export async function deletePiHoleInstance(id: number): Promise<PiHoleInstance[]> {
	return withInstancesLock(async () => {
		const instances = await getPiHoleInstances();
		const toDelete = instances.find((instance) => instance.id === id);
		const newInstances = instances.filter((instance) => instance.id !== id);
		if (toDelete?.isReference && newInstances.length >= 1) {
			newInstances[0].isReference = true;
		}
		await savePiHoleInstances(newInstances);
		return newInstances;
	});
}

export async function editPiHoleInstance(
	id: number,
	name: string,
	url: string,
	apiKey: string | undefined,
	isReference: boolean
): Promise<PiHoleInstance[]> {
	return withInstancesLock(async () => {
		const instances = await getPiHoleInstances();
		const preInstance = instances.find((instance) => instance.id === id);
		if (!preInstance) {
			throw new Error('Instance not found');
		}
		const resolvedApiKey = apiKey ?? preInstance.apiKey;
		let newInstances: PiHoleInstance[] = instances.map((instance) =>
			instance.id === id
				? { ...instance, name, url, apiKey: resolvedApiKey, isReference }
				: instance
		);
		if (preInstance.url !== url || preInstance.apiKey !== resolvedApiKey) {
			preInstance.url = url;
			preInstance.apiKey = resolvedApiKey;
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
					instance.id === id ? { ...instance, isReference: false } : instance
				);
				const nextReference = newInstances.find((instance) => instance.id !== id);
				if (nextReference) {
					nextReference.isReference = true;
				}
			}
		}
		await savePiHoleInstances(newInstances);
		return newInstances;
	});
}

export async function updatePiHoleInstanceCredentials(instance: PiHoleInstance) {
	await withInstancesLock(async () => {
		try {
			const instances = await getPiHoleInstances();
			if (!instances.find((i) => i.id === instance.id)) {
				throw new Error('Instance not found');
			}
			const newInstances = instances.map((toEdit) =>
				toEdit.id === instance.id
					? { ...toEdit, status: instance.status, sid: instance.sid, csrf: instance.csrf }
					: toEdit
			);
			await savePiHoleInstances(newInstances);
		} catch (error) {
			logger.error({ error }, 'Error updating instance credentials');
		}
	});
}
