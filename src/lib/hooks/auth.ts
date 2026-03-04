import { goto } from '$app/navigation';
import { resolve } from '$app/paths';
import { authStore } from '$lib/stores/auth';
import { browser } from '$app/environment';

// Require authentication
// @returns a function to unsubscribe from the auth store
export function requireAuth() {
	if (!browser) return;

	const unsubscribe = authStore.subscribe((state) => {
		if (!state.isAuthenticated) {
			goto(resolve('/auth'));
		}
	});

	return unsubscribe;
}

// Redirect if authenticated
// @returns a function to unsubscribe from the auth store
export function redirectIfAuthenticated() {
	if (!browser) return;

	const unsubscribe = authStore.subscribe((state) => {
		if (state.isAuthenticated) {
			goto(resolve('/'));
		}
	});

	return unsubscribe;
}
