describe('general rate limiter', () => {
  const originalMax = process.env.RATE_LIMIT_MAX;

  afterAll(() => {
    process.env.RATE_LIMIT_MAX = originalMax;
  });

  it('returns 429 in the standard error envelope once the general limit is exceeded', async () => {
    process.env.RATE_LIMIT_MAX = '1';
    const request = (await import('supertest')).default;
    await import('../src/db/schema.js');
    const app = (await import('../src/app.js')).default;

    await request(app).get('/health');
    const res = await request(app).get('/health');

    expect(res.status).toBe(429);
    expect(res.body).toEqual({
      success: false,
      error: { code: 'RATE_LIMITED', message: 'Too many requests, please try again later' },
    });
  });
});
