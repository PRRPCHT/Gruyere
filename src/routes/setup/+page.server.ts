import { fail, redirect } from '@sveltejs/kit';
import type { Actions } from './$types';
import { savePassword } from '$lib/models/password';

export const actions: Actions = {
	default: async ({ request }) => {
		const formData = await request.formData();
		const password = formData.get('password') as string;
		const confirm = formData.get('confirm') as string;

		if (!password || password.length < 8) {
			return fail(400, { error: 'Password must be at least 8 characters.' });
		}

		if (password !== confirm) {
			return fail(400, { error: 'Passwords do not match.' });
		}

		const saved = await savePassword(password);
		if (!saved) {
			return fail(500, { error: 'Failed to save password. Check server logs.' });
		}

		redirect(302, '/auth');
	}
};
