import { savePassword } from '$lib/models/password';
import { getSettings, saveSettings } from '$lib/models/settings';
import type { SynchronizationMode } from '$lib/types/types';
import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const settings = await getSettings();
	return {
		settings
	};
};

export const actions: Actions = {
	changeSettings: async ({ request, cookies }) => {
		try {
			const sessionCookie = cookies.get('auth_session');
			if (!sessionCookie || Date.now() >= parseInt(sessionCookie)) {
				return fail(401, { error: 'Unauthorized' });
			}
			const theForm = changeSettingsExtractAndValidate(await request.formData());
			console.log('theForm', theForm);
			if (theForm.isError) {
				return fail(400, theForm);
			}
			console.log('Saving settings');
			const settings = await getSettings();
			settings.isRefreshInstance = theForm.isRefreshInstance;
			settings.instanceRefreshInterval = theForm.instanceRefreshInterval;
			settings.synchronizeWithReference = theForm.synchronizeWithReference as SynchronizationMode;
			await saveSettings(settings);
			return { success: true, settingsSaved: true, settings: settings };
		} catch (error) {
			console.error('Error saving settings:', error);
			return fail(500, { error: 'Error saving settings' });
		}
	},
	changePassword: async ({ request, cookies }) => {
		try {
			const sessionCookie = cookies.get('auth_session');
			if (!sessionCookie || Date.now() >= parseInt(sessionCookie)) {
				return fail(401, { error: 'Unauthorized' });
			}
			const theForm = changePasswordExtractAndValidate(await request.formData());
			if (theForm.isError) {
				return fail(400, theForm);
			}
			const password = theForm.password;
			await savePassword(password);
			return { success: true, passwordSaved: true, password: password };
		} catch (error) {
			console.error('Error saving password:', error);
			return fail(500, { error: 'Error saving password' });
		}
	}
} satisfies Actions;

function changeSettingsExtractAndValidate(formData: FormData): Record<string, any> {
	let theForm: Record<string, any> = {
		isRefreshInstance: formData.get('isRefreshInstance') === 'on',
		instanceRefreshInterval: parseInt(formData.get('instanceRefreshInterval') as string),
		synchronizeWithReference: formData.get('synchronizeWithReference') as SynchronizationMode
	};
	theForm.missingInstanceRefreshInterval = theForm.instanceRefreshInterval === null;
	theForm.invalidInstanceRefreshInterval =
		isNaN(theForm.instanceRefreshInterval) || theForm.instanceRefreshInterval <= 0;
	theForm.missingSynchronizeWithReference = !theForm.synchronizeWithReference;
	theForm.isError =
		theForm.missingIsRefreshInstance ||
		theForm.missingInstanceRefreshInterval ||
		theForm.invalidInstanceRefreshInterval ||
		theForm.missingSynchronizeWithReference;
	return theForm;
}

function changePasswordExtractAndValidate(formData: FormData): Record<string, any> {
	const password = formData.get('password') as string;
	const theForm: Record<string, any> = {
		password
	};
	theForm.invalidPassword = !password || password.length < 6;
	theForm.isError = theForm.invalidPassword;
	return theForm;
}
