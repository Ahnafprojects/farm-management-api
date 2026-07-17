import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import { ApiError } from '../utils/ApiError.js';

/**
 * Verifies the `Authorization: Bearer <token>` header and attaches the
 * decoded payload to `req.user`. Missing, malformed, or expired tokens all
 * result in a generic 401 UNAUTHORIZED response.
 */
export function requireAuth(req, res, next) {
  const header = req.headers.authorization;

  if (!header || !header.startsWith('Bearer ')) {
    return next(ApiError.unauthorized('Missing or invalid Authorization header'));
  }

  const token = header.slice('Bearer '.length).trim();

  try {
    const payload = jwt.verify(token, config.jwt.secret, { algorithms: ['HS256'] });
    req.user = payload;
    return next();
  } catch {
    return next(ApiError.unauthorized('Invalid or expired token'));
  }
}

export default requireAuth;
