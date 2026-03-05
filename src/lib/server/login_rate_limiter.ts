import logger from '$lib/utils/logger';

const MAX_ATTEMPTS = 5;
const BASE_DELAY_MS = 1_000;
const MAX_DELAY_MS = 60_000;
const WINDOW_MS = 15 * 60 * 1_000;

type AttemptRecord = {
	count: number;
	lastAttempt: number;
};

// In-memory store: IP address → attempt record.
// Entries are cleaned up on access when they expire.
const attempts = new Map<string, AttemptRecord>();

/// Return the number of milliseconds the given IP must wait before
/// the next login attempt, or 0 if the attempt is allowed immediately.
export function getLoginDelay(ip: string): number {
	cleanup();
	const record = attempts.get(ip);
	if (!record || record.count < MAX_ATTEMPTS) {
		return 0;
	}
	const delay = Math.min(BASE_DELAY_MS * Math.pow(2, record.count - MAX_ATTEMPTS), MAX_DELAY_MS);
	const elapsed = Date.now() - record.lastAttempt;
	return Math.max(0, delay - elapsed);
}

/// Record a failed login attempt for the given IP.
export function recordFailedAttempt(ip: string): void {
	const record = attempts.get(ip);
	const now = Date.now();
	if (record) {
		record.count += 1;
		record.lastAttempt = now;
	} else {
		attempts.set(ip, { count: 1, lastAttempt: now });
	}
	logger.warn({ ip, attempts: record?.count ?? 1 }, 'Failed login attempt');
}

/// Reset the attempt counter for the given IP after a successful login.
export function resetAttempts(ip: string): void {
	attempts.delete(ip);
}

/// Remove stale entries older than the sliding window.
function cleanup(): void {
	const cutoff = Date.now() - WINDOW_MS;
	for (const [ip, record] of attempts) {
		if (record.lastAttempt < cutoff) {
			attempts.delete(ip);
		}
	}
}
