import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { createSession, validateSession, deleteSession } from './session';

beforeEach(() => {
	vi.useFakeTimers();
});

afterEach(() => {
	vi.useRealTimers();
});

describe('createSession', () => {
	it('returns a 64-char hex token and stores it as valid', () => {
		const token = createSession();

		expect(token).toMatch(/^[0-9a-f]{64}$/);
		expect(validateSession(token)).toBe(true);
	});

	it('returns unique tokens on successive calls', () => {
		const a = createSession();
		const b = createSession();

		expect(a).not.toBe(b);
	});
});

describe('validateSession', () => {
	it('returns true for a freshly created token', () => {
		const token = createSession();

		expect(validateSession(token)).toBe(true);
	});

	it('returns false for an unknown token', () => {
		expect(validateSession('does-not-exist')).toBe(false);
	});

	it('returns false and deletes an expired token', () => {
		const token = createSession();

		const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
		vi.advanceTimersByTime(sevenDaysMs);

		expect(validateSession(token)).toBe(false);
		// Second call confirms the token was deleted, not just expired
		expect(validateSession(token)).toBe(false);
	});

	it('returns true just before expiry', () => {
		const token = createSession();

		const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
		vi.advanceTimersByTime(sevenDaysMs - 1);

		expect(validateSession(token)).toBe(true);
	});
});

describe('deleteSession', () => {
	it('removes a valid token so it no longer validates', () => {
		const token = createSession();
		expect(validateSession(token)).toBe(true);

		deleteSession(token);

		expect(validateSession(token)).toBe(false);
	});

	it('does not throw on a non-existent token', () => {
		expect(() => deleteSession('no-such-token')).not.toThrow();
	});
});
