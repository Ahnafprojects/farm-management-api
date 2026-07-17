import { ApiError } from '../utils/ApiError.js';

/**
 * Builds a middleware that validates a given request part (`body`, `query`,
 * or `params`) against a Zod schema, replacing the original value with the
 * parsed/coerced one on success, or forwarding a VALIDATION_ERROR on failure.
 * @param {import('zod').ZodSchema} schema
 * @param {'body'|'query'|'params'} [source='body']
 */
export function validate(schema, source = 'body') {
  return function validateMiddleware(req, res, next) {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      const details = result.error.issues.map((issue) => ({
        field: issue.path.join('.') || source,
        message: issue.message,
      }));
      return next(ApiError.badRequest('Invalid request data', details));
    }
    req[source] = result.data;
    return next();
  };
}

export default validate;
