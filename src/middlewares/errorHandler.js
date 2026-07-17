import { ZodError } from 'zod';
import { config } from '../config/index.js';
import { ApiError } from '../utils/ApiError.js';
import { sendError } from '../utils/response.js';
import { logger } from '../utils/logger.js';

/**
 * Central error-handling middleware. Normalizes ApiError instances, Zod
 * validation errors, malformed-JSON body-parser errors, and any other
 * unexpected error into the standard error envelope. In production,
 * unexpected errors never leak internal messages or stack traces to the
 * client - they are logged server-side instead.
 */
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  if (err instanceof ApiError) {
    return sendError(res, {
      statusCode: err.statusCode,
      code: err.code,
      message: err.message,
      details: err.details,
    });
  }

  if (err instanceof ZodError) {
    const details = err.issues.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message,
    }));
    return sendError(res, {
      statusCode: 400,
      code: 'VALIDATION_ERROR',
      message: 'Invalid request data',
      details,
    });
  }

  // express.json() body-parser raises a SyntaxError with a `status`/`body` marker
  if (err instanceof SyntaxError && 'body' in err) {
    return sendError(res, {
      statusCode: 400,
      code: 'VALIDATION_ERROR',
      message: 'Malformed JSON in request body',
    });
  }

  if (err.type === 'entity.too.large') {
    return sendError(res, {
      statusCode: 400,
      code: 'VALIDATION_ERROR',
      message: 'Request body exceeds the allowed size limit',
    });
  }

  logger.error(err);

  return sendError(res, {
    statusCode: 500,
    code: 'INTERNAL_ERROR',
    message: config.isProduction ? 'An unexpected error occurred' : err.message,
  });
}

export default errorHandler;
