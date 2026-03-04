import { scrypt, randomBytes, timingSafeEqual } from 'crypto';
import { promisify } from 'util';

const fs = await import('fs/promises');
const path = await import('path');

const scryptAsync = promisify(scrypt);
const SALT_LENGTH = 16;
const KEY_LENGTH = 64;

const configDir = process.env.NODE_ENV === 'production' ? '/app/config' : './config';
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
		const data = JSON.parse(content);
		return typeof data.hash === 'string' && data.hash.length > 0;
	} catch {
		return false;
	}
}

export async function getPasswordHash(): Promise<string | null> {
	try {
		const content = await fs.readFile(passwordFilePath(), 'utf-8');
		const data = JSON.parse(content);
		return typeof data.hash === 'string' ? data.hash : null;
	} catch {
		return null;
	}
}

export async function savePassword(newPassword: string): Promise<boolean> {
	try {
		const hash = await hashPassword(newPassword);
		await fs.writeFile(passwordFilePath(), JSON.stringify({ hash }, null, 2));
		return true;
	} catch {
		return false;
	}
}
