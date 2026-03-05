// Shared config directory path.
// Uses CONFIG_DIR env var if set, /app/config in Docker, ./config in development.
export const configDir =
	process.env.CONFIG_DIR ?? (process.env.NODE_ENV === 'production' ? '/app/config' : './config');
