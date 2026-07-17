describe('auth-specific rate limiter', () => {
  const originalMax = process.env.AUTH_RATE_LIMIT_MAX;

  afterAll(() => {
    process.env.AUTH_RATE_LIMIT_MAX = originalMax;
  });

  it('returns 429 on /auth/* once the stricter limit is exceeded, without affecting /farms', async () => {
    process.env.AUTH_RATE_LIMIT_MAX = '1';
    const request = (await import('supertest')).default;
    await import('../src/db/schema.js');
    const app = (await import('../src/app.js')).default;

    await request(app).post('/auth/login').send({ email: 'a@a.com', password: 'wrongpass' });
    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'a@a.com', password: 'wrongpass' });

    expect(res.status).toBe(429);
    expect(res.body.error.code).toBe('RATE_LIMITED');

    const farmsRes = await request(app).get('/farms');
    expect(farmsRes.status).toBe(200);
  });
});
