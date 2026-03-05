import { writeFile, rename } from 'fs/promises';
import { dirname, join } from 'path';

// Write a file atomically by writing to a temporary file first, then renaming.
// On POSIX systems, rename() is atomic, so readers never see a partially-written file.
// @param filePath - The target file path
// @param data - The string content to write
export async function atomicWriteFile(filePath: string, data: string): Promise<void> {
	const dir = dirname(filePath);
	const tmpPath = join(dir, `.${Date.now()}.tmp`);
	await writeFile(tmpPath, data);
	await rename(tmpPath, filePath);
}
