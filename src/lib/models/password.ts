import { scrypt, randomBytes, timingSafeEqual } from 'crypto';
import { promisify } from 'util';
import { atomicWriteFile } from '$lib/utils/fs';
import { configDir } from './config';
import { PasswordFileSchema } from '$lib/types/schemas';

const fs = await import('fs/promises');
const path = await import('path');

const scryptAsync = promisify(scrypt);
const SALT_LENGTH = 16;
const KEY_LENGTH = 64;
const passwordFilePath = () => path.join(configDir, 'password.json');

export async function hashPassword(password: string): Promise<string> {
	const salt = randomBytes(SALT_LENGTH).toString('hex');
	const derivedKey = (await scryptAsync(password, salt, KEY_LENGTH)) as Buffer;
	return `${salt}:${derivedKey.toString('hex')}`;
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
	const [salt, storedKey] = hash.split(':');
	const derivedKey = (await scryptAsync(password, salt, KEY_LENGTH)) as Buffer;
	const storedBuffer = Buffer.from(storedKey, 'hex');
	return timingSafeEqual(derivedKey, storedBuffer);
}

export async function isPasswordSet(): Promise<boolean> {
	try {
		const content = await fs.readFile(passwordFilePath(), 'utf-8');
		const result = PasswordFileSchema.safeParse(JSON.parse(content));
		return result.success;
	} catch {
		return false;
	}
}

export async function getPasswordHash(): Promise<string | null> {
	try {
		const content = await fs.readFile(passwordFilePath(), 'utf-8');
		const result = PasswordFileSchema.safeParse(JSON.parse(content));
		return result.success ? result.data.hash : null;
	} catch {
		return null;
	}
}

export async function savePassword(newPassword: string): Promise<boolean> {
	try {
		const hash = await hashPassword(newPassword);
		await atomicWriteFile(passwordFilePath(), JSON.stringify({ hash }, null, 2));
		return true;
	} catch {
		return false;
	}
}
