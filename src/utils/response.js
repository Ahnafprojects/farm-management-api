/**
 * Sends a successful response using the standard envelope.
 * @param {import('express').Response} res
 * @param {object} options
 * @param {number} [options.statusCode=200]
 * @param {string} options.message
 * @param {*} [options.data=null]
 * @param {object} [options.meta] - pagination metadata, only present on list endpoints
 */
export function sendSuccess(res, { statusCode = 200, message, data = null, meta }) {
  const body = { success: true, message, data };
  if (meta) {
    body.meta = meta;
  }
  return res.status(statusCode).json(body);
}

/**
 * Sends an error response using the standard envelope.
 * @param {import('express').Response} res
 * @param {object} options
 * @param {number} options.statusCode
 * @param {string} options.code
 * @param {string} options.message
 * @param {Array<object>} [options.details]
 */
export function sendError(res, { statusCode, code, message, details }) {
  const body = { success: false, error: { code, message } };
  if (details) {
    body.error.details = details;
  }
  return res.status(statusCode).json(body);
}

export default { sendSuccess, sendError };
