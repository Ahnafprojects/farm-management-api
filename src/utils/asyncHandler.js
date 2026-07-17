/**
 * Wraps an async Express handler so rejected promises are forwarded to
 * `next(err)` instead of becoming unhandled rejections.
 * @param {Function} fn - async (req, res, next) => void
 * @returns {Function} Express-compatible middleware/handler
 */
export function asyncHandler(fn) {
  return function wrapped(req, res, next) {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

export default asyncHandler;
