import { savePassword } from '$lib/models/password';
import { getSettings, saveSettings } from '$lib/models/settings';
import type { SynchronizationMode } from '$lib/types/types';
import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import logger from '$lib/utils/logger';

export const load: PageServerLoad = async () => {
	const settings = await getSettings();
	return {
		settings
	};
};

export const actions: Actions = {
	changeSettings: async ({ request }) => {
		try {
			const theForm = changeSettingsExtractAndValidate(await request.formData());
			logger.debug({ theForm }, 'Settings form data');
			if (theForm.isError) {
				return fail(400, theForm);
			}
			logger.info('Saving settings');
			const settings = await getSettings();
			settings.isRefreshInstance = theForm.isRefreshInstance as boolean;
			settings.instanceRefreshInterval = theForm.instanceRefreshInterval as number;
			settings.synchronizeWithReference = theForm.synchronizeWithReference as SynchronizationMode;
			await saveSettings(settings);
			return { success: true, settingsSaved: true, settings: settings };
		} catch (error) {
			logger.error({ error }, 'Error saving settings');
			return fail(500, { error: 'Error saving settings' });
		}
	},
	changePassword: async ({ request }) => {
		try {
			const theForm = changePasswordExtractAndValidate(await request.formData());
			if (theForm.isError) {
				return fail(400, theForm);
			}
			const password = theForm.password as string;
			await savePassword(password);
			return { success: true, passwordSaved: true };
		} catch (error) {
			logger.error({ error }, 'Error saving password');
			return fail(500, { error: 'Error saving password' });
		}
	}
} satisfies Actions;

function changeSettingsExtractAndValidate(formData: FormData): Record<string, unknown> {
	const theForm: Record<string, unknown> = {
		isRefreshInstance: formData.get('isRefreshInstance') === 'on',
		instanceRefreshInterval: parseInt(formData.get('instanceRefreshInterval') as string),
		synchronizeWithReference: formData.get('synchronizeWithReference') as SynchronizationMode
	};
	theForm.missingInstanceRefreshInterval = theForm.instanceRefreshInterval === null;
	theForm.invalidInstanceRefreshInterval =
		isNaN(theForm.instanceRefreshInterval as number) ||
		(theForm.instanceRefreshInterval as number) <= 0;
	theForm.missingSynchronizeWithReference = !theForm.synchronizeWithReference;
	theForm.isError =
		theForm.missingIsRefreshInstance ||
		theForm.missingInstanceRefreshInterval ||
		theForm.invalidInstanceRefreshInterval ||
		theForm.missingSynchronizeWithReference;
	return theForm;
}

function changePasswordExtractAndValidate(formData: FormData): Record<string, unknown> {
	const password = formData.get('password') as string;
	const theForm: Record<string, unknown> = {
		password
	};
	theForm.invalidPassword = !password || password.length < 6;
	theForm.isError = theForm.invalidPassword;
	return theForm;
}
