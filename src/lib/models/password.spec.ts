import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { mkdtemp, rm, writeFile } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';

let tempDir: string;

beforeEach(async () => {
	tempDir = await mkdtemp(join(tmpdir(), 'gruyere-pw-'));
	vi.stubEnv('CONFIG_DIR', tempDir);
});

afterEach(async () => {
	vi.unstubAllEnvs();
	// Re-import picks up stale configDir; clean up the temp dir
	await rm(tempDir, { recursive: true, force: true });
});

// Dynamic import so each test picks up the stubbed CONFIG_DIR.
// configDir is evaluated once at import time, so we must reset modules.
async function loadModules() {
	vi.resetModules();
	const password = await import('./password');
	return password;
}

describe('hashPassword', () => {
	it('produces a salt:key format string', async () => {
		const { hashPassword } = await loadModules();
		const hash = await hashPassword('test-password');

		expect(hash).toMatch(/^[0-9a-f]+:[0-9a-f]+$/);
		const [salt, key] = hash.split(':');
		expect(salt).toHaveLength(32); // 16 bytes = 32 hex chars
		expect(key).toHaveLength(128); // 64 bytes = 128 hex chars
	});
});

describe('verifyPassword', () => {
	it('returns true for matching password and hash', async () => {
		const { hashPassword, verifyPassword } = await loadModules();
		const hash = await hashPassword('my-secret');

		expect(await verifyPassword('my-secret', hash)).toBe(true);
	});

	it('returns false for wrong password', async () => {
		const { hashPassword, verifyPassword } = await loadModules();
		const hash = await hashPassword('correct-password');

		expect(await verifyPassword('wrong-password', hash)).toBe(false);
	});
});

describe('savePassword / getPasswordHash', () => {
	it('writes to password.json and reads it back', async () => {
		const { savePassword, getPasswordHash, verifyPassword } = await loadModules();

		const saved = await savePassword('round-trip');
		expect(saved).toBe(true);

		const hash = await getPasswordHash();
		expect(hash).not.toBeNull();
		expect(await verifyPassword('round-trip', hash!)).toBe(true);
	});
});

describe('isPasswordSet', () => {
	it('returns false when password.json is missing', async () => {
		const { isPasswordSet } = await loadModules();

		expect(await isPasswordSet()).toBe(false);
	});

	it('returns true when a valid password.json exists', async () => {
		const { savePassword, isPasswordSet } = await loadModules();

		await savePassword('some-password');
		expect(await isPasswordSet()).toBe(true);
	});

	it('returns false when password.json contains invalid JSON', async () => {
		const { isPasswordSet } = await loadModules();

		await writeFile(join(tempDir, 'password.json'), 'not-json!!!');
		expect(await isPasswordSet()).toBe(false);
	});

	it('returns false when password.json has empty hash', async () => {
		const { isPasswordSet } = await loadModules();

		await writeFile(join(tempDir, 'password.json'), JSON.stringify({ hash: '' }));
		expect(await isPasswordSet()).toBe(false);
	});
});

describe('getPasswordHash', () => {
	it('returns null when file is missing', async () => {
		const { getPasswordHash } = await loadModules();

		expect(await getPasswordHash()).toBeNull();
	});

	it('returns null when file is malformed', async () => {
		const { getPasswordHash } = await loadModules();

		await writeFile(join(tempDir, 'password.json'), '{ broken json');
		expect(await getPasswordHash()).toBeNull();
	});
});
