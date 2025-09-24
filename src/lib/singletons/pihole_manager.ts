// import { PiHoleClient } from '$lib/clients/pihole_client';
// import { getPiHoleInstances, savePiHoleInstances } from '$lib/models/pihole_instances';
// import { PiHoleInstanceStatus, type PiHoleInstances, type PiHoleInstance } from '$lib/types/types';

// class PiHoleManager {
// 	private static instance: PiHoleManager;
// 	private instances: PiHoleInstances | null = null;
// 	private clients: Map<number, PiHoleClient> = new Map();
// 	private initialized: boolean = false;

// 	private constructor() {}

// 	public static getInstance(): PiHoleManager {
// 		if (!PiHoleManager.instance) {
// 			PiHoleManager.instance = new PiHoleManager();
// 		}
// 		return PiHoleManager.instance;
// 	}

// 	public async initialize(): Promise<void> {
// 		if (this.initialized) {
// 			return;
// 		}

// 		try {
// 			// Load instances from file
// 			this.instances = await getPiHoleInstances();

// 			// Create clients for each instance
// 			for (const instance of this.instances.instances) {
// 				const client = new PiHoleClient(instance.url, instance.apiKey);
// 				this.clients.set(instance.id, client);

// 				// Check authentication status
// 				instance.status = await client.authenticate();
// 			}

// 			this.initialized = true;
// 			console.log('PiHoleManager initialized with', this.instances.instances.length, 'instances');
// 		} catch (error) {
// 			console.error('Failed to initialize PiHoleManager:', error);
// 			throw error;
// 		}
// 	}

// 	public getInstances(): PiHoleInstance[] {
// 		if (!this.initialized || !this.instances) {
// 			throw new Error('PiHoleManager not initialized');
// 		}
// 		return this.instances.instances;
// 	}

// 	public getInstance(id: number): PiHoleInstance | undefined {
// 		if (!this.initialized || !this.instances) {
// 			throw new Error('PiHoleManager not initialized');
// 		}
// 		return this.instances.instances.find((instance) => instance.id === id);
// 	}

// 	public getClient(id: number): PiHoleClient | undefined {
// 		if (!this.initialized) {
// 			throw new Error('PiHoleManager not initialized');
// 		}
// 		return this.clients.get(id);
// 	}

// 	public async addInstance(
// 		instance: Omit<PiHoleInstance, 'id' | 'status'>
// 	): Promise<PiHoleInstance> {
// 		if (!this.initialized || !this.instances) {
// 			throw new Error('PiHoleManager not initialized');
// 		}

// 		const newInstance: PiHoleInstance = {
// 			...instance,
// 			id: this.instances.getNextId(),
// 			status: PiHoleInstanceStatus.UNREACHABLE
// 		};

// 		// Create client for new instance
// 		const client = new PiHoleClient(newInstance.url, newInstance.apiKey);
// 		newInstance.status = await client.authenticate();
// 		this.clients.set(newInstance.id, client);

// 		// Add to instances
// 		this.instances.addInstance(newInstance);

// 		// Save to file
// 		await savePiHoleInstances(this.instances);

// 		return newInstance;
// 	}

// 	public async removeInstance(id: number): Promise<boolean> {
// 		if (!this.initialized || !this.instances) {
// 			throw new Error('PiHoleManager not initialized');
// 		}

// 		// Remove client
// 		this.clients.delete(id);

// 		// Remove from instances
// 		const index = this.instances.instances.findIndex((instance) => instance.id === id);
// 		if (index === -1) {
// 			return false;
// 		}

// 		this.instances.instances.splice(index, 1);

// 		// Save to file
// 		await savePiHoleInstances(this.instances);

// 		return true;
// 	}

// 	public async refreshInstanceStatus(id: number): Promise<PiHoleInstanceStatus> {
// 		if (!this.initialized || !this.instances) {
// 			throw new Error('PiHoleManager not initialized');
// 		}

// 		const instance = this.instances.instances.find((inst) => inst.id === id);
// 		const client = this.clients.get(id);

// 		if (!instance || !client) {
// 			throw new Error('Instance or client not found');
// 		}

// 		const status = await client.authenticate();
// 		instance.status = status;

// 		// Save updated status
// 		await savePiHoleInstances(this.instances);

// 		return status;
// 	}

// 	public async refreshAllStatuses(): Promise<void> {
// 		if (!this.initialized || !this.instances) {
// 			throw new Error('PiHoleManager not initialized');
// 		}

// 		for (const instance of this.instances.instances) {
// 			const client = this.clients.get(instance.id);
// 			if (client) {
// 				instance.status = await client.authenticate();
// 			}
// 		}

// 		// Save updated statuses
// 		await savePiHoleInstances(this.instances);
// 	}

// 	public isInitialized(): boolean {
// 		return this.initialized;
// 	}

// 	public async pauseAllInstances(): Promise<{
// 		success: number;
// 		failed: number;
// 		results: Array<{ id: number; success: boolean; error?: string }>;
// 	}> {
// 		if (!this.initialized || !this.instances) {
// 			throw new Error('PiHoleManager not initialized');
// 		}

// 		const results: Array<{ id: number; success: boolean; error?: string }> = [];
// 		let successCount = 0;
// 		let failedCount = 0;

// 		for (const instance of this.instances.instances) {
// 			if (instance.status !== PiHoleInstanceStatus.ACTIVE) {
// 				results.push({ id: instance.id, success: false, error: 'Instance not active' });
// 				failedCount++;
// 				continue;
// 			}

// 			const client = this.clients.get(instance.id);
// 			if (!client) {
// 				results.push({ id: instance.id, success: false, error: 'Client not found' });
// 				failedCount++;
// 				continue;
// 			}

// 			try {
// 				const success = await client.pause();
// 				results.push({ id: instance.id, success });
// 				if (success) {
// 					successCount++;
// 				} else {
// 					failedCount++;
// 				}
// 			} catch (error) {
// 				results.push({
// 					id: instance.id,
// 					success: false,
// 					error: error instanceof Error ? error.message : 'Unknown error'
// 				});
// 				failedCount++;
// 			}
// 		}

// 		return { success: successCount, failed: failedCount, results };
// 	}

// 	public async resumeAllInstances(): Promise<{
// 		success: number;
// 		failed: number;
// 		results: Array<{ id: number; success: boolean; error?: string }>;
// 	}> {
// 		if (!this.initialized || !this.instances) {
// 			throw new Error('PiHoleManager not initialized');
// 		}

// 		const results: Array<{ id: number; success: boolean; error?: string }> = [];
// 		let successCount = 0;
// 		let failedCount = 0;

// 		for (const instance of this.instances.instances) {
// 			if (instance.status !== PiHoleInstanceStatus.ACTIVE) {
// 				results.push({ id: instance.id, success: false, error: 'Instance not active' });
// 				failedCount++;
// 				continue;
// 			}

// 			const client = this.clients.get(instance.id);
// 			if (!client) {
// 				results.push({ id: instance.id, success: false, error: 'Client not found' });
// 				failedCount++;
// 				continue;
// 			}

// 			try {
// 				const success = await client.resume();
// 				results.push({ id: instance.id, success });
// 				if (success) {
// 					successCount++;
// 				} else {
// 					failedCount++;
// 				}
// 			} catch (error) {
// 				results.push({
// 					id: instance.id,
// 					success: false,
// 					error: error instanceof Error ? error.message : 'Unknown error'
// 				});
// 				failedCount++;
// 			}
// 		}

// 		return { success: successCount, failed: failedCount, results };
// 	}

// 	public async updateAllGravities(): Promise<{
// 		success: number;
// 		failed: number;
// 		results: Array<{ id: number; success: boolean; error?: string }>;
// 	}> {
// 		if (!this.initialized || !this.instances) {
// 			throw new Error('PiHoleManager not initialized');
// 		}

// 		const results: Array<{ id: number; success: boolean; error?: string }> = [];
// 		let successCount = 0;
// 		let failedCount = 0;

// 		for (const instance of this.instances.instances) {
// 			if (instance.status !== PiHoleInstanceStatus.ACTIVE) {
// 				results.push({ id: instance.id, success: false, error: 'Instance not active' });
// 				failedCount++;
// 				continue;
// 			}

// 			const client = this.clients.get(instance.id);
// 			if (!client) {
// 				results.push({ id: instance.id, success: false, error: 'Client not found' });
// 				failedCount++;
// 				continue;
// 			}

// 			try {
// 				const success = await client.updateGravity();
// 				results.push({ id: instance.id, success });
// 				if (success) {
// 					successCount++;
// 				} else {
// 					failedCount++;
// 				}
// 			} catch (error) {
// 				results.push({
// 					id: instance.id,
// 					success: false,
// 					error: error instanceof Error ? error.message : 'Unknown error'
// 				});
// 				failedCount++;
// 			}
// 		}

// 		return { success: successCount, failed: failedCount, results };
// 	}
// }

// // Export singleton instance
// export const piholeManager = PiHoleManager.getInstance();
