import { sendSuccess } from '../utils/response.js';

const startedAt = Date.now();

export function getHealth(req, res) {
  sendSuccess(res, {
    message: 'Service is healthy',
    data: {
      status: 'ok',
      uptime: Math.floor((Date.now() - startedAt) / 1000),
      timestamp: new Date().toISOString(),
    },
  });
}

export default { getHealth };
