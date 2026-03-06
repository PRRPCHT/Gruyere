import { describe, expect, it, vi, afterEach } from 'vitest';

afterEach(() => {
	vi.unstubAllEnvs();
});

async function loadConfigDir() {
	vi.resetModules();
	const { configDir } = await import('./config');
	return configDir;
}

describe('configDir', () => {
	it('uses CONFIG_DIR env var when set', async () => {
		vi.stubEnv('CONFIG_DIR', '/custom/path');

		const dir = await loadConfigDir();

		expect(dir).toBe('/custom/path');
	});

	it('defaults to /app/config in production', async () => {
		vi.stubEnv('NODE_ENV', 'production');

		const dir = await loadConfigDir();

		expect(dir).toBe('/app/config');
	});

	it('defaults to ./config in development', async () => {
		vi.stubEnv('NODE_ENV', 'development');

		const dir = await loadConfigDir();

		expect(dir).toBe('./config');
	});
});
