import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { getLoginDelay, recordFailedAttempt, resetAttempts } from './login_rate_limiter';

vi.mock('$lib/utils/logger', () => ({
	default: { warn: vi.fn() }
}));

beforeEach(() => {
	vi.useFakeTimers();
});

afterEach(() => {
	// Reset the in-memory attempts map by clearing all known IPs
	resetAttempts('192.168.1.1');
	resetAttempts('10.0.0.1');
	vi.useRealTimers();
});

describe('getLoginDelay', () => {
	it('returns 0 for a new IP', () => {
		expect(getLoginDelay('192.168.1.1')).toBe(0);
	});

	it('returns 0 when under 5 failed attempts', () => {
		const ip = '192.168.1.1';
		for (let i = 0; i < 4; i++) {
			recordFailedAttempt(ip);
		}
		expect(getLoginDelay(ip)).toBe(0);
	});

	it('returns exponential delay after 5+ failed attempts', () => {
		const ip = '192.168.1.1';
		for (let i = 0; i < 5; i++) {
			recordFailedAttempt(ip);
		}
		// 5th attempt: 1000 * 2^0 = 1000ms
		expect(getLoginDelay(ip)).toBe(1_000);

		recordFailedAttempt(ip);
		// 6th attempt: 1000 * 2^1 = 2000ms
		expect(getLoginDelay(ip)).toBe(2_000);

		recordFailedAttempt(ip);
		// 7th attempt: 1000 * 2^2 = 4000ms
		expect(getLoginDelay(ip)).toBe(4_000);
	});

	it('caps delay at 60 000 ms regardless of attempt count', () => {
		const ip = '192.168.1.1';
		for (let i = 0; i < 20; i++) {
			recordFailedAttempt(ip);
		}
		expect(getLoginDelay(ip)).toBe(60_000);
	});

	it('subtracts elapsed time from the delay', () => {
		const ip = '192.168.1.1';
		for (let i = 0; i < 5; i++) {
			recordFailedAttempt(ip);
		}
		// Full delay = 1000ms, advance 400ms
		vi.advanceTimersByTime(400);
		expect(getLoginDelay(ip)).toBe(600);
	});

	it('returns 0 when the full delay has elapsed', () => {
		const ip = '192.168.1.1';
		for (let i = 0; i < 5; i++) {
			recordFailedAttempt(ip);
		}
		vi.advanceTimersByTime(1_000);
		expect(getLoginDelay(ip)).toBe(0);
	});
});

describe('recordFailedAttempt', () => {
	it('increments counter correctly across calls', () => {
		const ip = '192.168.1.1';

		// First 4 attempts: still under threshold, delay = 0
		for (let i = 0; i < 4; i++) {
			recordFailedAttempt(ip);
			expect(getLoginDelay(ip)).toBe(0);
		}

		// 5th attempt crosses the threshold
		recordFailedAttempt(ip);
		expect(getLoginDelay(ip)).toBeGreaterThan(0);
	});
});

describe('resetAttempts', () => {
	it('clears delay for an IP after successful login', () => {
		const ip = '192.168.1.1';
		for (let i = 0; i < 6; i++) {
			recordFailedAttempt(ip);
		}
		expect(getLoginDelay(ip)).toBeGreaterThan(0);

		resetAttempts(ip);

		expect(getLoginDelay(ip)).toBe(0);
	});
});

describe('cleanup', () => {
	it('removes stale entries older than the 15 min window', () => {
		const ip = '192.168.1.1';
		for (let i = 0; i < 6; i++) {
			recordFailedAttempt(ip);
		}
		expect(getLoginDelay(ip)).toBeGreaterThan(0);

		// Advance past the 15-minute window
		vi.advanceTimersByTime(15 * 60 * 1_000 + 1);

		// cleanup() runs inside getLoginDelay and removes the stale entry
		expect(getLoginDelay(ip)).toBe(0);
	});
});
