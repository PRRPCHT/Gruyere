import { authenticate, pauseDNSBlocking } from '$lib/clients/pihole_client';
import {
	deletePiHoleInstance,
	editPiHoleInstance,
	getNextId,
	getPiHoleInstances,
	savePiHoleInstances
} from '$lib/models/pihole_instances';
import { PiHoleInstanceStatus, type ActionStatus, type PiHoleInstance } from '$lib/types/types';
import type { Actions, ServerLoad } from '@sveltejs/kit';
import { fail, redirect } from '@sveltejs/kit';

export const load: ServerLoad = async ({ cookies }) => {
	// Check authentication
	const sessionCookie = cookies.get('auth_session');
	let isAuthenticated = false;

	if (sessionCookie) {
		try {
			const expires = parseInt(sessionCookie);
			isAuthenticated = Date.now() < expires;

			if (!isAuthenticated) {
				cookies.delete('auth_session', { path: '/' });
			}
		} catch (error) {
			console.error('Invalid session cookie:', error);
			cookies.delete('auth_session', { path: '/' });
		}
	}

	if (!isAuthenticated) {
		throw redirect(302, '/auth');
	}

	let instances = await getPiHoleInstances();
	instances.forEach((instance) => {
		instance.status = PiHoleInstanceStatus.REFRESHING;
	});

	return {
		instances: instances
	};
};
//bamcRAdfwFqecE0HjDLgLqfGon5Y6TykFIIEvrN3mf0=
export const actions: Actions = {
	addPiHoleInstance: async ({ request, cookies }) => {
		// Check authentication
		const sessionCookie = cookies.get('auth_session');
		if (!sessionCookie || Date.now() >= parseInt(sessionCookie)) {
			return fail(401, { error: 'Unauthorized' });
		}
		let theForm: Record<string, any> = addPiHoleInstanceExtractAndValidate(
			await request.formData()
		);
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
	},
	editPiHoleInstance: async ({ request, cookies }) => {
		// Check authentication
		const sessionCookie = cookies.get('auth_session');
		if (!sessionCookie || Date.now() >= parseInt(sessionCookie)) {
			return fail(401, { error: 'Unauthorized' });
		}
		let theForm: Record<string, any> = editPiHoleInstanceExtractAndValidate(
			await request.formData()
		);
		if (theForm.isError) {
			return fail(400, theForm);
		}
		try {
			const newInstances = await editPiHoleInstance(
				parseInt(theForm.id),
				theForm.name,
				theForm.url,
				theForm.apiKey,
				theForm.isReference
			);
			return {
				success: true,
				instances: newInstances
			};
		} catch (error) {
			console.error('Error deleting Pi-hole instance:', error);
			return fail(500, theForm);
		}
	},
	deletePiHoleInstance: async ({ request, cookies }) => {
		// Check authentication
		const sessionCookie = cookies.get('auth_session');
		if (!sessionCookie || Date.now() >= parseInt(sessionCookie)) {
			return fail(401, { error: 'Unauthorized' });
		}
		let theForm: Record<string, any> = deletePiHoleInstanceExtractAndValidate(
			await request.formData()
		);
		if (theForm.isError) {
			return fail(400, theForm);
		}
		try {
			const newInstances = await deletePiHoleInstance(parseInt(theForm.id));
			return {
				success: true,
				instances: newInstances
			};
		} catch (error) {
			console.error('Error deleting Pi-hole instance:', error);
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

function addPiHoleInstanceExtractAndValidate(formData: FormData): Record<string, any> {
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

function editPiHoleInstanceExtractAndValidate(formData: FormData): Record<string, any> {
	const id = clean(formData.get('id') as string);
	const name = clean(formData.get('name') as string);
	const url = clean(formData.get('url') as string);
	const apiKey = clean(formData.get('apiKey') as string);
	const isReference = formData.get('isReference') === 'true';

	let theForm: Record<string, any> = {
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

function deletePiHoleInstanceExtractAndValidate(formData: FormData): Record<string, any> {
	const id = clean(formData.get('id') as string);

	let theForm: Record<string, any> = {
		id
	};

	theForm.missingId = !theForm.id;

	theForm.isError = theForm.missingId;
	return theForm;
}
