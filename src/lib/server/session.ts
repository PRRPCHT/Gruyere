import { randomBytes } from 'crypto';

const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

// In-memory session store: opaque token → expiry timestamp.
// Survives the process lifetime; a restart invalidates all sessions.
const sessions = new Map<string, number>();

// Create a new session and return the opaque token.
export function createSession(): string {
	const token = randomBytes(32).toString('hex');
	sessions.set(token, Date.now() + SESSION_DURATION_MS);
	return token;
}

// Return true if the token exists in the store and has not expired.
export function validateSession(token: string): boolean {
	const expires = sessions.get(token);
	if (expires === undefined) return false;
	if (Date.now() >= expires) {
		sessions.delete(token);
		return false;
	}
	return true;
}

// Remove the session from the store, immediately invalidating it.
export function deleteSession(token: string): void {
	sessions.delete(token);
}
