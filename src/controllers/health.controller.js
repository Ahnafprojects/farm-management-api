const startedAt = Date.now();

export function getHealth(req, res) {
  res.status(200).json({
    success: true,
    message: 'Service is healthy',
    data: {
      status: 'ok',
      uptime: Math.floor((Date.now() - startedAt) / 1000),
      timestamp: new Date().toISOString(),
    },
  });
}

export default { getHealth };
