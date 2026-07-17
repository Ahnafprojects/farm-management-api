import rateLimit from 'express-rate-limit';
import { config } from '../config/index.js';
import { sendError } from '../utils/response.js';

function rateLimitHandler(req, res) {
  sendError(res, {
    statusCode: 429,
    code: 'RATE_LIMITED',
    message: 'Too many requests, please try again later',
  });
}

/**
 * General-purpose limiter applied to all routes.
 */
export const generalLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
});

/**
 * Stricter limiter applied to /auth/* routes to slow down brute-force
 * credential attacks.
 */
export const authLimiter = rateLimit({
  windowMs: config.authRateLimit.windowMs,
  max: config.authRateLimit.max,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
});

export default { generalLimiter, authLimiter };
