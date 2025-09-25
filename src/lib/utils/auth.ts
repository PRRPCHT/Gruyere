import config from '../../../config.json';

// Verify the password
// @param password - The password to verify
// @returns true if the password is correct, false otherwise
export function verifyPassword(password: string): boolean {
	return password === config.password;
}

// Generate a session token
// @returns a random session token
export function generateSessionToken(): string {
	return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

// Check if the session is valid
// @param sessionExpires - The expiration time of the session
// @returns true if the session is valid, false otherwise
export function isSessionValid(sessionExpires: number | null): boolean {
	if (!sessionExpires) return false;
	return Date.now() < sessionExpires;
}
