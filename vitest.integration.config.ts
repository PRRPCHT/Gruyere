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
		include: [
			'src/hooks.server.spec.ts',
			'src/lib/clients/**/*.integration.ts',
			'src/routes/**/*.spec.ts'
		],
		exclude: ['src/routes/page.svelte.spec.ts']
	}
});
