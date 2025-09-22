import { authenticate } from '$lib/clients/pihole_client';
import { getNextId, getPiHoleInstances, savePiHoleInstances } from '$lib/models/pihole_instances';
import { PiHoleInstanceStatus, type PiHoleInstance } from '$lib/types/types';
import type { Actions } from '@sveltejs/kit';
import { fail } from '@sveltejs/kit';

export const load = async ({ locals }: { locals: any }) => {
	// Ensure manager is initialized
	// if (!piholeManager.isInitialized()) {
	// 	await piholeManager.initialize();
	// }

	// // Get instances from singleton
	// const instances = piholeManager.getInstances();
	const instances = await getPiHoleInstances();

	return {
		instances: instances
	};
};
//bamcRAdfwFqecE0HjDLgLqfGon5Y6TykFIIEvrN3mf0=
export const actions: Actions = {
	addPiHoleInstance: async ({ request }) => {
		let theForm: Record<string, any> = extractAndValidate(await request.formData());
		if (theForm.isError) {
			return fail(400, theForm);
		}

		try {
			let instances = await getPiHoleInstances();
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
			console.error('Error adding PiHole instance:', error);
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

function extractAndValidate(formData: FormData): Record<string, any> {
	const name = clean(formData.get('name') as string);
	const url = clean(formData.get('url') as string);
	const apiKey = clean(formData.get('apiKey') as string);

	let theForm: Record<string, any> = {
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
