import { updatePiHoleInstanceCredentials } from '$lib/models/pihole_instances';
import type { PiHoleInstance } from '$lib/types/types';

import { PiHoleInstanceStatus } from '$lib/types/types';

async function checkAuthentication(instance: PiHoleInstance) {
	try {
		const response = await fetch(`${instance.url}/api/auth`, {
			method: 'GET',
			headers: {
				'Content-Type': 'application/json',
				sid: instance.sid
			}
		});

		if (response.status !== 200) {
			await authenticate(instance);
			await updatePiHoleInstanceCredentials(instance);
		}
		return true;
	} catch (error) {
		console.error('Error checking authentication:', error);
		return false;
	}
}

export async function authenticate(instance: PiHoleInstance) {
	console.log('Authenticating with Pi-hole', instance.name);
	try {
		const response = await fetch(`${instance.url}/api/auth`, {
			method: 'POST',
			body: JSON.stringify({
				password: instance.apiKey
			})
		});
		if (response.status === 401 || response.status === 403) {
			instance.status = PiHoleInstanceStatus.UNAUTHORIZED;
		}
		const data = await response.json();
		if (data.session) {
			instance.sid = data.session.sid;
			instance.csrf = data.session.csrf;
			instance.status = PiHoleInstanceStatus.ACTIVE;
		} else {
			instance.status = PiHoleInstanceStatus.UNREACHABLE;
		}
	} catch (error) {
		console.error(error);
		instance.status = PiHoleInstanceStatus.UNREACHABLE;
	}
}

export async function pauseDNSBlocking(instance: PiHoleInstance, duration: number) {
	console.log('Pausing DNS blocking for Pi-hole', instance.name);
	try {
		await checkAuthentication(instance);
		const response = await fetch(`${instance.url}/api/dns/blocking`, {
			method: 'POST',
			body: JSON.stringify({
				csrf: instance.csrf,
				sid: instance.sid,
				timer: duration,
				blocking: false
			})
		});
		return response.status === 200;
	} catch (error) {
		console.error('Error pausing DNS blocking:', error);
		return false;
	}
}

export async function resumeDNSBlocking(instance: PiHoleInstance) {
	console.log('Activating DNS blocking for Pi-hole', instance.name);
	try {
		await checkAuthentication(instance);
		const response = await fetch(`${instance.url}/api/dns/blocking`, {
			method: 'POST',
			body: JSON.stringify({
				csrf: instance.csrf,
				sid: instance.sid,
				blocking: true
			})
		});
		return response.status === 200;
	} catch (error) {
		console.error('Error activating DNS blocking:', error);
		return false;
	}
}

// 	async pause(): Promise<boolean> {
// 		try {
// 			const response = await fetch(`${this.url}/api/disable`, {
// 				method: 'POST',
// 				headers: {
// 					'Content-Type': 'application/json',
// 					Cookie: `PHPSESSID=${this.sid}`,
// 					'X-CSRF-TOKEN': this.csrf
// 				}
// 			});
// 			return response.ok;
// 		} catch (error) {
// 			console.error('Error pausing PiHole:', error);
// 			return false;
// 		}
// 	}

// 	async resume(): Promise<boolean> {
// 		try {
// 			const response = await fetch(`${this.url}/api/enable`, {
// 				method: 'POST',
// 				headers: {
// 					'Content-Type': 'application/json',
// 					Cookie: `PHPSESSID=${this.sid}`,
// 					'X-CSRF-TOKEN': this.csrf
// 				}
// 			});
// 			return response.ok;
// 		} catch (error) {
// 			console.error('Error resuming PiHole:', error);
// 			return false;
// 		}
// 	}

// 	async updateGravity(): Promise<boolean> {
// 		try {
// 			const response = await fetch(`${this.url}/api/gravity/update`, {
// 				method: 'POST',
// 				headers: {
// 					'Content-Type': 'application/json',
// 					Cookie: `PHPSESSID=${this.sid}`,
// 					'X-CSRF-TOKEN': this.csrf
// 				}
// 			});
// 			return response.ok;
// 		} catch (error) {
// 			console.error('Error updating gravity:', error);
// 			return false;
// 		}
// 	}
// }
