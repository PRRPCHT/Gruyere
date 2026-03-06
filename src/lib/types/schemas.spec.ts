import { describe, expect, it } from 'vitest';
import { PiHoleInstanceSchema, SettingsSchema, PasswordFileSchema } from './schemas';
import { PiHoleInstanceStatus, SynchronizationMode } from './types';

const validInstance = {
	id: 1,
	name: 'Pi-hole Primary',
	url: 'http://192.168.1.1:80',
	apiKey: 'secret',
	isReference: true,
	sid: 'abc',
	csrf: 'def',
	status: PiHoleInstanceStatus.ACTIVE
};

describe('PiHoleInstanceSchema', () => {
	it('accepts a valid instance object', () => {
		expect(PiHoleInstanceSchema.safeParse(validInstance).success).toBe(true);
	});

	it('rejects missing name', () => {
		const { name: _, ...rest } = validInstance;
		expect(PiHoleInstanceSchema.safeParse(rest).success).toBe(false);
	});

	it('rejects empty name', () => {
		expect(PiHoleInstanceSchema.safeParse({ ...validInstance, name: '' }).success).toBe(false);
	});

	it('rejects missing url', () => {
		const { url: _, ...rest } = validInstance;
		expect(PiHoleInstanceSchema.safeParse(rest).success).toBe(false);
	});

	it('rejects invalid URL format', () => {
		expect(PiHoleInstanceSchema.safeParse({ ...validInstance, url: 'not-a-url' }).success).toBe(
			false
		);
	});

	it('rejects missing id', () => {
		const { id: _, ...rest } = validInstance;
		expect(PiHoleInstanceSchema.safeParse(rest).success).toBe(false);
	});

	it('rejects non-integer id', () => {
		expect(PiHoleInstanceSchema.safeParse({ ...validInstance, id: 1.5 }).success).toBe(false);
	});

	it('rejects invalid status value', () => {
		expect(
			PiHoleInstanceSchema.safeParse({ ...validInstance, status: 'unknown-status' }).success
		).toBe(false);
	});
});

describe('SettingsSchema', () => {
	const validSettings = {
		isRefreshInstance: true,
		instanceRefreshInterval: 30,
		synchronizeWithReference: SynchronizationMode.PARTIAL
	};

	it('accepts valid settings', () => {
		expect(SettingsSchema.safeParse(validSettings).success).toBe(true);
	});

	it('rejects zero instanceRefreshInterval', () => {
		expect(SettingsSchema.safeParse({ ...validSettings, instanceRefreshInterval: 0 }).success).toBe(
			false
		);
	});

	it('rejects negative instanceRefreshInterval', () => {
		expect(
			SettingsSchema.safeParse({ ...validSettings, instanceRefreshInterval: -5 }).success
		).toBe(false);
	});

	it('rejects non-integer instanceRefreshInterval', () => {
		expect(
			SettingsSchema.safeParse({ ...validSettings, instanceRefreshInterval: 1.5 }).success
		).toBe(false);
	});

	it('rejects invalid synchronizeWithReference value', () => {
		expect(
			SettingsSchema.safeParse({ ...validSettings, synchronizeWithReference: 'all' }).success
		).toBe(false);
	});
});

describe('PasswordFileSchema', () => {
	it('accepts a valid hash string', () => {
		expect(PasswordFileSchema.safeParse({ hash: 'abc123' }).success).toBe(true);
	});

	it('rejects empty hash string', () => {
		expect(PasswordFileSchema.safeParse({ hash: '' }).success).toBe(false);
	});

	it('rejects missing hash field', () => {
		expect(PasswordFileSchema.safeParse({}).success).toBe(false);
	});
});
