export enum PiHoleInstanceStatus {
	ACTIVE = 'active',
	UNAUTHORIZED = 'unauthorized',
	UNREACHABLE = 'unreachable',
	REFRESHING = 'refreshing'
}

export type PiHoleInstance = {
	id: number;
	name: string;
	url: string;
	apiKey: string;
	isReference: boolean;
	sid: string;
	csrf: string;
	status: PiHoleInstanceStatus;
};

export class PiHoleInstances {
	instances: PiHoleInstance[] = [];

	constructor(instances: PiHoleInstance[]) {
		this.instances = instances;
	}

	getNextId(): number {
		return this.instances.reduce((max, instance) => Math.max(max, instance.id), 0) + 1;
	}

	addInstance(instance: PiHoleInstance): void {
		this.instances.push(instance);
	}
}

export enum PauseDurationTimeScale {
	SECONDS = 'Seconds',
	MINUTES = 'Minutes',
	HOURS = 'Hours',
	DAYS = 'Days'
}

export type ActionStatus = {
	success: boolean;
	instance: string;
	message: string;
	instanceStatus: PiHoleInstanceStatus;
};

export type Toast = {
	id: number;
	status: ActionStatus;
};

export type Group = {
	name: string;
	comment: string | null;
	enabled: boolean;
	id: number;
	date_added: number;
	date_modified: number;
};
