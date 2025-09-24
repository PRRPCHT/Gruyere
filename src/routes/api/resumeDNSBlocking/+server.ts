import { resumeDNSBlocking } from '$lib/clients/pihole_client';
import type { ActionStatus, PiHoleInstance } from '$lib/types/types';
import { json } from '@sveltejs/kit';

export const POST = async ({ request }) => {
	let { instance }: { instance: PiHoleInstance } = await request.json();
	if (!instance) {
		let actionStatus: ActionStatus = {
			success: false,
			instance: 'Unknown instance',
			message: 'Failed to resume DNS blocking'
		};
		return json({ success: false, status: actionStatus });
	}
	let success = true;
	try {
		const resumeSuccess = await resumeDNSBlocking(instance);
		success = success && resumeSuccess;
		let actionStatus: ActionStatus = {
			success: resumeSuccess,
			instance: instance.name,
			message: resumeSuccess ? 'DNS blocking resumed successfully' : 'Failed to resume DNS blocking'
		};
		return json({ success, status: actionStatus });
	} catch (error) {
		console.error('Error resuming DNS blocking:', error);
		let actionStatus: ActionStatus = {
			success: false,
			instance: instance.name,
			message: 'Failed to resume DNS blocking'
		};
		return json({ success: false, status: actionStatus });
	}
};
