import { updatePiHoleInstanceCredentials } from '$lib/models/pihole_instances';
import type { PiHoleInstance } from '$lib/types/types';
import { PiHoleInstanceStatus } from '$lib/types/types';

// Check if the token is still valid and update the instance credentials if needed
// @param instance - The instance to check authentication for
// @returns true if the authentication is valid, false otherwise
export async function checkAuthentication(instance: PiHoleInstance): Promise<PiHoleInstanceStatus> {
	try {
		const response = await fetch(`${instance.url}/api/auth`, {
			method: 'GET',
			headers: {
				'Content-Type': 'application/json',
				sid: instance.sid
			},
			signal: AbortSignal.timeout(3000)
		});

		if (response.status !== 200) {
			let toReturn = await authenticate(instance);
			await updatePiHoleInstanceCredentials(instance);
			return toReturn;
		}
		return PiHoleInstanceStatus.ACTIVE;
	} catch (error: any) {
		checkError(error, instance, 'Error checking authentication');
		return PiHoleInstanceStatus.UNREACHABLE;
	}
}

// Authenticate with the Pi-hole instance
// @param instance - The instance to authenticate with
// @returns true if the authentication is successful, false otherwise
export async function authenticate(instance: PiHoleInstance): Promise<PiHoleInstanceStatus> {
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
		checkError(error, instance, 'Error authenticating');
		instance.status = PiHoleInstanceStatus.UNREACHABLE;
	}

	await updatePiHoleInstanceCredentials(instance);
	return instance.status;
}

// Pause DNS blocking for the Pi-hole instance
// @param instance - The instance to pause DNS blocking for
// @param duration - The duration to pause DNS blocking for
// @returns true if the DNS blocking is paused successfully, false otherwise
export async function pauseDNSBlocking(
	instance: PiHoleInstance,
	duration: number
): Promise<boolean> {
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
		checkError(error, instance, 'Error pausing DNS blocking');
		return false;
	}
}

// Resume DNS blocking for the Pi-hole instance
// @param instance - The instance to resume DNS blocking for
// @returns true if the DNS blocking is resumed successfully, false otherwise
export async function resumeDNSBlocking(instance: PiHoleInstance): Promise<boolean> {
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
		checkError(error, instance, 'Error activating DNS blocking');
		return false;
	}
}

// Update the gravity for the Pi-hole instance
// @param instance - The instance to update gravity for
// @returns true if the gravity is updated successfully, false otherwise
export async function updateGravity(instance: PiHoleInstance): Promise<boolean> {
	console.log('Updating gravity for Pi-hole', instance.name);
	try {
		await checkAuthentication(instance);
		const response = await fetch(`${instance.url}/api/action/gravity`, {
			method: 'POST',
			body: JSON.stringify({
				csrf: instance.csrf,
				sid: instance.sid
			})
		});
		return response.status === 200;
	} catch (error) {
		checkError(error, instance, 'Error updating gravity');
		return false;
	}
}

// Restart the DNS for the Pi-hole instance
// @param instance - The instance to restart DNS for
// @returns true if the DNS is restarted successfully, false otherwise
export async function restartDNS(instance: PiHoleInstance): Promise<boolean> {
	console.log('Restarting DNS for Pi-hole', instance.name);
	try {
		await checkAuthentication(instance);
		const response = await fetch(`${instance.url}/api/action/restartdns`, {
			method: 'POST',
			body: JSON.stringify({
				csrf: instance.csrf,
				sid: instance.sid
			})
		});
		const data = await response.json();
		return response.status === 200 && data.status === 'ok';
	} catch (error) {
		checkError(error, instance, 'Error restarting DNS');
		return false;
	}
}

// Check if the error is a connection timeout or host unreachable or something else and prints it in the console
// @param error - The error to check
// @param instance - The instance to check the error for
// @param message - The message to display
function checkError(error: any, instance: PiHoleInstance, message: string) {
	instance.status = PiHoleInstanceStatus.UNREACHABLE;
	if (
		error.cause?.code === 'UND_ERR_CONNECT_TIMEOUT' ||
		error.cause?.code === 'EHOSTDOWN' ||
		error.cause?.code === 'ECONNREFUSED' ||
		error.message.includes('timeout') ||
		error.message.includes('UND_ERR_CONNECT_TIMEOUT') ||
		error.message.includes('EHOSTDOWN') ||
		error.message.includes('ECONNREFUSED')
	) {
		console.error(instance.name, '- Connection timeout or host unreachable');
	} else {
		console.error(instance.name, '-', message, error);
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
