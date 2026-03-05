import { writable } from 'svelte/store';
import { goto } from '$app/navigation';
import { resolve } from '$app/paths';

// Auth state
export interface AuthState {
	isAuthenticated: boolean;
}

// Create auth store
const createAuthStore = () => {
	const { subscribe, set } = writable<AuthState>({
		isAuthenticated: false
	});

	return {
		subscribe,
		logout: async () => {
			try {
				await fetch('/api/auth/logout', {
					method: 'POST'
				});
			} catch (error) {
				console.error('Logout error:', error);
			} finally {
				set({ isAuthenticated: false });
				goto(resolve('/auth'));
			}
		},
		initialize: (isAuthenticated: boolean) => {
			set({ isAuthenticated });
		}
	};
};

export const authStore = createAuthStore();
