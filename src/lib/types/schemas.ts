import { z } from 'zod';
import { PiHoleInstanceStatus, SynchronizationMode } from './types';

// Schema for a single Pi-hole instance as stored in instances.json
export const PiHoleInstanceSchema = z.object({
	id: z.number().int(),
	name: z.string().min(1),
	url: z.string().url(),
	apiKey: z.string(),
	isReference: z.boolean(),
	sid: z.string(),
	csrf: z.string(),
	status: z.nativeEnum(PiHoleInstanceStatus)
});

// Schema for the instances.json file (array of instances)
export const PiHoleInstancesSchema = z.array(PiHoleInstanceSchema);

// Schema for the config.json file
export const SettingsSchema = z.object({
	isRefreshInstance: z.boolean(),
	instanceRefreshInterval: z.number().int().positive(),
	synchronizeWithReference: z.nativeEnum(SynchronizationMode)
});

// Schema for the password.json file
export const PasswordFileSchema = z.object({
	hash: z.string().min(1)
});
