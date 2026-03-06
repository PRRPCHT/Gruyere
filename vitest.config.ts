import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
	resolve: {
		alias: {
			$lib: resolve(__dirname, './src/lib')
		}
	},
	test: {
		environment: 'node',
		// Unit tests only — mocked, safe to run in CI.
		// Integration tests (*.integration.ts) require live Pi-hole instances
		// and must be run manually with: npm run test:integration
		include: ['src/**/*.spec.ts'],
		exclude: ['src/routes/page.svelte.spec.ts']
	}
});
