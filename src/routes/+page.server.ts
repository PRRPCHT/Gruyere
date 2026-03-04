import { authenticate } from '$lib/clients/pihole_client';
import {
	deletePiHoleInstance,
	editPiHoleInstance,
	getNextId,
	getPiHoleInstances,
	savePiHoleInstances
} from '$lib/models/pihole_instances';
import { getSettings } from '$lib/models/settings';
import { PiHoleInstanceStatus, type PiHoleInstance } from '$lib/types/types';
import type { Actions, ServerLoad } from '@sveltejs/kit';
import { fail } from '@sveltejs/kit';
import logger from '$lib/utils/logger';

export const load: ServerLoad = async () => {
	const instances = await getPiHoleInstances();

	return {
		instances: instances,
		settings: await getSettings()
	};
};
//bamcRAdfwFqecE0HjDLgLqfGon5Y6TykFIIEvrN3mf0=
export const actions: Actions = {
	addPiHoleInstance: async ({ request }) => {
		const theForm: Record<string, unknown> = addPiHoleInstanceExtractAndValidate(
			await request.formData()
		);
		if (theForm.isError) {
			return fail(400, theForm);
		}

		try {
			const instances = await getPiHoleInstances();
			const isReference = instances.length === 0;

			// Add instance using singleton
			const newInstance: PiHoleInstance = {
				id: getNextId(instances),
				name: theForm.name as string,
				url: theForm.url as string,
				apiKey: theForm.apiKey as string,
				isReference: isReference,
				sid: '',
				csrf: '',
				status: PiHoleInstanceStatus.UNREACHABLE
			};
			await authenticate(newInstance);
			instances.push(newInstance);
			await savePiHoleInstances(instances);

			return {
				success: true,
				instances: instances
			};
		} catch (error) {
			logger.error({ error, formData: theForm }, 'Error adding PiHole instance');
			return fail(500, theForm);
		}
	},
	editPiHoleInstance: async ({ request }) => {
		const theForm: Record<string, unknown> = editPiHoleInstanceExtractAndValidate(
			await request.formData()
		);
		if (theForm.isError) {
			return fail(400, theForm);
		}
		try {
			const newInstances = await editPiHoleInstance(
				parseInt(theForm.id as string),
				theForm.name as string,
				theForm.url as string,
				theForm.apiKey as string,
				theForm.isReference as boolean
			);
			return {
				success: true,
				instances: newInstances
			};
		} catch (error) {
			logger.error({ error, formData: theForm }, 'Error managing Pi-hole instance');
			return fail(500, theForm);
		}
	},
	deletePiHoleInstance: async ({ request }) => {
		const theForm: Record<string, unknown> = deletePiHoleInstanceExtractAndValidate(
			await request.formData()
		);
		if (theForm.isError) {
			return fail(400, theForm);
		}
		try {
			const newInstances = await deletePiHoleInstance(parseInt(theForm.id as string));
			return {
				success: true,
				instances: newInstances
			};
		} catch (error) {
			logger.error({ error, formData: theForm }, 'Error managing Pi-hole instance');
			return fail(500, theForm);
		}
	}
} satisfies Actions;

function clean(element: string | null | undefined): string | null | undefined {
	if (!element) {
		return element;
	}
	return element.trim();
}

function addPiHoleInstanceExtractAndValidate(formData: FormData): Record<string, unknown> {
	const name = clean(formData.get('name') as string);
	const url = clean(formData.get('url') as string);
	const apiKey = clean(formData.get('apiKey') as string);

	const theForm: Record<string, unknown> = {
		name,
		url,
		apiKey
	};

	theForm.missingName = !theForm.name;
	theForm.missingUrl = !theForm.url;
	theForm.missingApiKey = !theForm.apiKey;

	theForm.isError = theForm.missingName || theForm.missingUrl || theForm.missingApiKey;

	return theForm;
}

function editPiHoleInstanceExtractAndValidate(formData: FormData): Record<string, unknown> {
	const id = clean(formData.get('id') as string);
	const name = clean(formData.get('name') as string);
	const url = clean(formData.get('url') as string);
	const apiKey = clean(formData.get('apiKey') as string);
	const isReference = formData.get('isReference') === 'true';

	const theForm: Record<string, unknown> = {
		id,
		name,
		url,
		apiKey,
		isReference
	};
	theForm.missingName = !theForm.name;
	theForm.missingId = !theForm.id;
	theForm.missingUrl = !theForm.url;
	theForm.missingApiKey = !theForm.apiKey;

	theForm.isError =
		theForm.missingName || theForm.missingUrl || theForm.missingApiKey || theForm.missingId;
	return theForm;
}

function deletePiHoleInstanceExtractAndValidate(formData: FormData): Record<string, unknown> {
	const id = clean(formData.get('id') as string);

	const theForm: Record<string, unknown> = {
		id
	};

	theForm.missingId = !theForm.id;

	theForm.isError = theForm.missingId;
	return theForm;
}
