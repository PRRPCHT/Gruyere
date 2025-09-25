import { writable } from 'svelte/store';
import { goto } from '$app/navigation';

// Auth state
export interface AuthState {
	isAuthenticated: boolean;
	sessionExpires: number | null;
}

// Create auth store
const createAuthStore = () => {
	const { subscribe, set, update } = writable<AuthState>({
		isAuthenticated: false,
		sessionExpires: null
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
				set({
					isAuthenticated: false,
					sessionExpires: null
				});
				goto('/auth');
			}
		},
		initialize: (serverAuthState: boolean) => {
			update((state) => ({
				...state,
				isAuthenticated: serverAuthState,
				sessionExpires: serverAuthState ? Date.now() + 7 * 24 * 60 * 60 * 1000 : null
			}));
			return serverAuthState;
		}
	};
};

export const authStore = createAuthStore();
