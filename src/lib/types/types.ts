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

export enum ListType {
	ALLOW = 'allow',
	BLOCK = 'block'
}

export type List = {
	address: string;
	type: ListType;
	comment: string | null;
	groups: number[];
	enabled: boolean;
	id: number;
	date_added: number;
	date_modified: number;
	date_updated: number;
	valid_domains: number;
	invalid_domains: number;
	abp_entries: number;
	status: number;
};

export type Client = {
	client: string;
	comment: string | null;
	groups: number[];
	id: number;
	date_added: number;
	date_modified: number;
	name: string | null;
};

export enum DomainType {
	ALLOW = 'allow',
	DENY = 'deny'
}

export enum DomainKind {
	EXACT = 'exact',
	REGEX = 'regex'
}

export type Domain = {
	domain: string;
	unicode: string;
	type: DomainType;
	kind: DomainKind;
	comment: string | null;
	groups: number[];
	enabled: boolean;
	id: number;
	date_added: number;
	date_modified: number;
};

export enum SynchronizationMode {
	PARTIAL = 'partial',
	COMPLETE = 'complete'
}

export type Settings = {
	isRefreshInstance: boolean;
	instanceRefreshInterval: number;
	synchronizeWithReference: SynchronizationMode;
};

export type Stats = {
	queries: {
		total: number;
		blocked: number;
		percent_blocked: number;
		unique_domains: number;
		forwarded: number;
		cached: number;
		frequency: number;
		types: {
			A: number;
			AAAA: number;
			ANY: number;
			SRV: number;
			SOA: number;
			PTR: number;
			TXT: number;
			NAPTR: number;
			MX: number;
			DS: number;
			RRSIG: number;
			DNSKEY: number;
			NS: number;
			SVCB: number;
			HTTPS: number;
			OTHER: number;
		};
		status: {
			UNKNOWN: number;
			GRAVITY: number;
			FORWARDED: number;
			CACHE: number;
			REGEX: number;
			DENYLIST: number;
		};
	};
	replies: {
		UNKNOWN: number;
		NODATA: number;
		NXDOMAIN: number;
		CNAME: number;
		IP: number;
		DOMAIN: number;
	};
	clients: {
		active: number;
		total: number;
	};
	gravity: {
		domains_being_blocked: number;
		last_update: number;
	};
	took: number;
};
