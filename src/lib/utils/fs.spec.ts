import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, readFile, readdir, writeFile } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';

// Wrap fs/promises so we can control rename per-test while keeping real implementations.
vi.mock('fs/promises', async (importOriginal) => {
	const actual = await importOriginal<typeof import('fs/promises')>();
	return { ...actual, rename: vi.fn(actual.rename) };
});

let tempDir: string;

beforeEach(async () => {
	tempDir = await mkdtemp(join(tmpdir(), 'gruyere-fs-'));
	vi.mocked((await import('fs/promises')).rename).mockRestore?.();
});

afterEach(async () => {
	vi.restoreAllMocks();
	await rm(tempDir, { recursive: true, force: true });
});

// Import after the mock is registered so fs.ts picks up the wrapped rename.
const { atomicWriteFile } = await import('./fs');

describe('atomicWriteFile', () => {
	it('writes content that can be read back correctly', async () => {
		const filePath = join(tempDir, 'test.json');
		const content = JSON.stringify({ hello: 'world' }, null, 2);

		await atomicWriteFile(filePath, content);

		expect(await readFile(filePath, 'utf-8')).toBe(content);
	});

	it('overwrites an existing file with new content', async () => {
		const filePath = join(tempDir, 'test.json');
		await atomicWriteFile(filePath, 'original');
		await atomicWriteFile(filePath, 'updated');

		expect(await readFile(filePath, 'utf-8')).toBe('updated');
	});

	it('does not leave a .tmp file behind after a successful write', async () => {
		const filePath = join(tempDir, 'test.json');

		await atomicWriteFile(filePath, 'data');

		const entries = await readdir(tempDir);
		expect(entries.every((e) => !e.endsWith('.tmp'))).toBe(true);
	});

	it('preserves original file content when rename fails', async () => {
		const filePath = join(tempDir, 'test.json');
		await writeFile(filePath, 'original-content');

		const { rename } = await import('fs/promises');
		vi.mocked(rename).mockRejectedValueOnce(new Error('EXDEV: cross-device link not permitted'));

		await expect(atomicWriteFile(filePath, 'new-content')).rejects.toThrow();
		expect(await readFile(filePath, 'utf-8')).toBe('original-content');
	});

	it('throws when parent directory does not exist', async () => {
		const filePath = join(tempDir, 'nonexistent-dir', 'test.json');

		await expect(atomicWriteFile(filePath, 'data')).rejects.toThrow();
	});
});
