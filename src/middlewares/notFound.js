import { sendError } from '../utils/response.js';

/**
 * Catches any request that didn't match a route and responds with a
 * standard-envelope 404, so unknown routes are indistinguishable in shape
 * from any other error response.
 */
export function notFound(req, res) {
  sendError(res, {
    statusCode: 404,
    code: 'NOT_FOUND',
    message: `Route ${req.method} ${req.originalUrl} not found`,
  });
}

export default notFound;
