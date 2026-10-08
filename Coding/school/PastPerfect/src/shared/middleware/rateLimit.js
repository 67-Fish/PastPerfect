import rateLimit from 'express-rate-limit';
import { env } from '../../config/env.js';

export const rateLimiters = {
  api: rateLimit({
    windowMs: env.RATE_LIMIT.WINDOW_MS,
    max: env.RATE_LIMIT.MAX_REQUESTS,
    message: { error: 'Too many requests, please try again later' },
    standardHeaders: true,
    legacyHeaders: false,
  }),

  auth: rateLimit({
    windowMs: env.RATE_LIMIT.WINDOW_MS,
    max: env.RATE_LIMIT.AUTH_MAX_REQUESTS,
    message: { error: 'Too many authentication attempts, please try again later' },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true,
  }),

  upload: rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 20,
    message: { error: 'Too many uploads, please try again later' },
    standardHeaders: true,
    legacyHeaders: false,
  }),
};