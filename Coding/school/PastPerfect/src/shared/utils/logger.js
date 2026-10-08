import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
});

export function createChildLogger(bindings) {
  return logger.child(bindings);
}