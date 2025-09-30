import pino from 'pino';

// Create logger instance
const logger = pino({
	level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
	transport:
		process.env.NODE_ENV === 'production'
			? undefined
			: {
					target: 'pino-pretty',
					options: {
						colorize: true,
						translateTime: 'SYS:standard',
						ignore: 'pid,hostname'
					}
				}
});

export default logger;
