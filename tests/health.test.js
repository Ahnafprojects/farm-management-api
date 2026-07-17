import request from 'supertest';
import '../src/db/schema.js';
import app from '../src/app.js';

describe('GET /health', () => {
  it('returns 200 with a healthy status envelope', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('ok');
    expect(typeof res.body.data.uptime).toBe('number');
  });
});
