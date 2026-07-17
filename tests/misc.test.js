import request from 'supertest';
import '../src/db/schema.js';
import app from '../src/app.js';

describe('malformed request bodies', () => {
  it('returns 400 VALIDATION_ERROR for malformed JSON', async () => {
    const res = await request(app)
      .post('/auth/login')
      .set('Content-Type', 'application/json')
      .send('{"email": "a@b.com", "password": ');

    expect(res.status).toBe(400);
    expect(res.body).toEqual({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Malformed JSON in request body' },
    });
  });

  it('returns 400 VALIDATION_ERROR for a body over the 10kb limit', async () => {
    const res = await request(app)
      .post('/auth/register')
      .set('Content-Type', 'application/json')
      .send(JSON.stringify({ email: 'big@example.com', password: 'x'.repeat(20000) }));

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});
