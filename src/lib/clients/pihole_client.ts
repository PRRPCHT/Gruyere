import type { PiHoleInstance } from '$lib/types/types';

import { PiHoleInstanceStatus } from '$lib/types/types';

export async function authenticate(instance: PiHoleInstance) {
	console.log('Authenticating with Pi-hole...');
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
	console.log('Pausing DNS blocking for Pi-hole...');
	// try {
	// 	const response = await fetch(`${instance.url}/api/dns/blocking`, {
	// 		method: 'POST',
	// 		body: JSON.stringify({
	// 			timer: duration
	// 		})
	// 	});
	// 	return response.status === 200;
	// } catch (error) {
	// 	console.error('Error pausing DNS blocking:', error);
	// 	return false;
	// }
	return instance.url.endsWith('880');
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
