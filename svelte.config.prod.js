import adapter from '@sveltejs/adapter-node';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	// Consult https://svelte.dev/docs/kit/integrations
	// for more information about preprocessors
	preprocess: vitePreprocess(),

	kit: {
		// Use Node.js adapter for production/Docker builds
		adapter: adapter({
			out: 'build',
			precompress: false,
			envPrefix: '',
			polyfill: true
		})
	}
};

export default config;
