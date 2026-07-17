import jwt from 'jsonwebtoken';
import request from 'supertest';
import '../src/db/schema.js';
import { db } from '../src/db/connection.js';
import app from '../src/app.js';

let token;

const seedFarms = [
  { name: 'Sawah Alpha', location: 'Malang, Jawa Timur', area_hectare: 10, crop_type: 'padi' },
  { name: 'Kebun Beta', location: 'Kediri, Jawa Timur', area_hectare: 5, crop_type: 'jagung' },
  { name: 'Sawah Gamma', location: 'Bandung, Jawa Barat', area_hectare: 20, crop_type: 'padi' },
];

beforeAll(async () => {
  db.exec('DELETE FROM farms');
  db.exec('DELETE FROM users');

  const insert = db.prepare(`
    INSERT INTO farms (name, location, area_hectare, crop_type, created_at, updated_at)
    VALUES (@name, @location, @area_hectare, @crop_type, @created_at, @updated_at)
  `);
  const now = new Date().toISOString();
  for (const farm of seedFarms) {
    insert.run({ ...farm, created_at: now, updated_at: now });
  }

  await request(app)
    .post('/auth/register')
    .send({ email: 'farmer@example.com', password: 'password123' });
  const loginRes = await request(app)
    .post('/auth/login')
    .send({ email: 'farmer@example.com', password: 'password123' });
  token = loginRes.body.data.token;
});

function expectErrorEnvelope(res, statusCode, code) {
  expect(res.status).toBe(statusCode);
  expect(res.body.success).toBe(false);
  expect(res.body.error.code).toBe(code);
  expect(typeof res.body.error.message).toBe('string');
}

describe('GET /farms', () => {
  it('returns a paginated list with meta', async () => {
    const res = await request(app).get('/farms?page=1&limit=2');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.meta).toMatchObject({ page: 1, limit: 2, totalItems: 3, totalPages: 2 });
  });

  it('caps limit at 100', async () => {
    const res = await request(app).get('/farms?limit=500');
    expectErrorEnvelope(res, 400, 'VALIDATION_ERROR');
  });

  it.each([
    ['page', '0'],
    ['page', 'abc'],
    ['limit', '0'],
    ['limit', '101'],
  ])('rejects %s=%s with 400', async (param, value) => {
    const res = await request(app).get(`/farms?${param}=${value}`);
    expectErrorEnvelope(res, 400, 'VALIDATION_ERROR');
  });

  it('filters by location (case-insensitive partial match)', async () => {
    const res = await request(app).get('/farms?location=malang');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].name).toBe('Sawah Alpha');
  });

  it('filters by crop_type', async () => {
    const res = await request(app).get('/farms?crop_type=PADI');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
  });

  it('filters by search on name', async () => {
    const res = await request(app).get('/farms?search=sawah');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.data.every((f) => f.name.toLowerCase().includes('sawah'))).toBe(true);
  });

  it('combines filters with AND', async () => {
    const res = await request(app).get('/farms?search=sawah&location=bandung');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].name).toBe('Sawah Gamma');
  });

  it('returns 200 with an empty array (not 404) when no rows match', async () => {
    const res = await request(app).get('/farms?search=zzz-does-not-exist-zzz');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toEqual([]);
    expect(res.body.meta).toMatchObject({ totalItems: 0, totalPages: 0 });
  });

  it('sorts by name ascending', async () => {
    const res = await request(app).get('/farms?sort=name&order=asc&limit=100');
    const names = res.body.data.map((f) => f.name);
    expect(names).toEqual([...names].sort());
  });

  it('sorts by area_hectare descending', async () => {
    const res = await request(app).get('/farms?sort=area_hectare&order=desc&limit=100');
    const areas = res.body.data.map((f) => f.area_hectare).filter((a) => a !== null);
    expect(areas).toEqual([...areas].sort((a, b) => b - a));
  });

  it('rejects an invalid sort value with 400', async () => {
    const res = await request(app).get('/farms?sort=evil');
    expectErrorEnvelope(res, 400, 'VALIDATION_ERROR');
  });

  it('rejects an invalid order value with 400', async () => {
    const res = await request(app).get('/farms?order=sideways');
    expectErrorEnvelope(res, 400, 'VALIDATION_ERROR');
  });
});

describe('GET /farms/:id', () => {
  it.each(['abc', '-1', '0', '1.5'])('returns 400 for id=%s', async (id) => {
    const res = await request(app).get(`/farms/${id}`);
    expectErrorEnvelope(res, 400, 'VALIDATION_ERROR');
  });

  it('returns 404 for a nonexistent id', async () => {
    const res = await request(app).get('/farms/999999');
    expectErrorEnvelope(res, 404, 'NOT_FOUND');
  });

  it('returns 200 with the full object for an existing farm', async () => {
    const list = await request(app).get('/farms?limit=1');
    const expected = list.body.data[0];
    const res = await request(app).get(`/farms/${expected.id}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual(expected);
    expect(() => new Date(res.body.data.created_at).toISOString()).not.toThrow();
  });
});

describe('POST /farms', () => {
  it('rejects requests without a token with 401 and does not persist the row', async () => {
    const before = await request(app).get('/farms?limit=100');
    const res = await request(app).post('/farms').send({ name: 'No Auth Farm' });
    expectErrorEnvelope(res, 401, 'UNAUTHORIZED');
    const after = await request(app).get('/farms?limit=100');
    expect(after.body.meta.totalItems).toBe(before.body.meta.totalItems);
  });

  it('rejects requests with a malformed token with 401', async () => {
    const res = await request(app)
      .post('/farms')
      .set('Authorization', 'Bearer invalid.token.value')
      .send({ name: 'Bad Token Farm' });
    expectErrorEnvelope(res, 401, 'UNAUTHORIZED');
  });

  it('rejects a token signed with the wrong secret with 401', async () => {
    const forged = jwt.sign({ sub: 1, email: 'farmer@example.com' }, 'not-the-real-secret', {
      algorithm: 'HS256',
    });
    const res = await request(app)
      .post('/farms')
      .set('Authorization', `Bearer ${forged}`)
      .send({ name: 'Forged Farm' });
    expectErrorEnvelope(res, 401, 'UNAUTHORIZED');
  });

  it('rejects an expired token with 401', async () => {
    const expired = jwt.sign({ sub: 1, email: 'farmer@example.com' }, process.env.JWT_SECRET, {
      algorithm: 'HS256',
      expiresIn: -10,
    });
    const res = await request(app)
      .post('/farms')
      .set('Authorization', `Bearer ${expired}`)
      .send({ name: 'Expired Token Farm' });
    expectErrorEnvelope(res, 401, 'UNAUTHORIZED');
  });

  it('rejects an alg:none token with 401', async () => {
    const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
    const payload = Buffer.from(JSON.stringify({ sub: 1, email: 'farmer@example.com' })).toString(
      'base64url',
    );
    const noneToken = `${header}.${payload}.`;
    const res = await request(app)
      .post('/farms')
      .set('Authorization', `Bearer ${noneToken}`)
      .send({ name: 'Alg None Farm' });
    expectErrorEnvelope(res, 401, 'UNAUTHORIZED');
  });

  it('rejects a missing name with 400', async () => {
    const res = await request(app)
      .post('/farms')
      .set('Authorization', `Bearer ${token}`)
      .send({ location: 'Nowhere' });
    expectErrorEnvelope(res, 400, 'VALIDATION_ERROR');
    expect(res.body.error.details.some((d) => d.field === 'name')).toBe(true);
  });

  it('rejects an empty name with 400', async () => {
    const res = await request(app)
      .post('/farms')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: '' });
    expectErrorEnvelope(res, 400, 'VALIDATION_ERROR');
  });

  it('rejects a whitespace-only name with 400', async () => {
    const res = await request(app)
      .post('/farms')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: '   ' });
    expectErrorEnvelope(res, 400, 'VALIDATION_ERROR');
  });

  it('rejects a name over 100 characters with 400', async () => {
    const res = await request(app)
      .post('/farms')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'A'.repeat(101) });
    expectErrorEnvelope(res, 400, 'VALIDATION_ERROR');
  });

  it.each([-5, 0, 'not-a-number'])('rejects area_hectare=%s with 400', async (area_hectare) => {
    const res = await request(app)
      .post('/farms')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Bad Area Farm', area_hectare });
    expectErrorEnvelope(res, 400, 'VALIDATION_ERROR');
  });

  it('rejects unknown fields with 400', async () => {
    const res = await request(app)
      .post('/farms')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Farm X', extra: 'nope' });
    expectErrorEnvelope(res, 400, 'VALIDATION_ERROR');
  });

  it('rejects mass-assignment of system fields (id, created_at, admin) with 400', async () => {
    const res = await request(app)
      .post('/farms')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Mass Assign Farm', id: 999, created_at: '1990-01-01', admin: true });
    expectErrorEnvelope(res, 400, 'VALIDATION_ERROR');
    const fields = res.body.error.details.map((d) => d.field);
    expect(fields.length).toBeGreaterThan(0);

    const list = await request(app).get('/farms?search=Mass Assign Farm');
    expect(list.body.data).toHaveLength(0);
  });

  it('creates a farm and returns 201 with a Location header', async () => {
    const res = await request(app).post('/farms').set('Authorization', `Bearer ${token}`).send({
      name: 'Sawah Delta',
      location: 'Solo, Jawa Tengah',
      area_hectare: 7.5,
      crop_type: 'padi',
    });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe('Sawah Delta');
    expect(res.headers.location).toBe(`/farms/${res.body.data.id}`);
  });

  it('creates a farm with only the required field, leaving optional fields null', async () => {
    const res = await request(app)
      .post('/farms')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Sawah Minimal' });

    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ location: null, area_hectare: null, crop_type: null });
  });
});

describe('PUT /farms/:id', () => {
  let farmId;

  beforeAll(async () => {
    const res = await request(app)
      .post('/farms')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'To Update', location: 'Somewhere', area_hectare: 1, crop_type: 'jagung' });
    farmId = res.body.data.id;
  });

  it('fully updates the farm: fields change, id/created_at stay, updated_at changes', async () => {
    const before = await request(app).get(`/farms/${farmId}`);

    await new Promise((resolve) => setTimeout(resolve, 10));

    const res = await request(app)
      .put(`/farms/${farmId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Updated Name', location: 'New Place', area_hectare: 2, crop_type: 'tebu' });

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      id: farmId,
      name: 'Updated Name',
      location: 'New Place',
      area_hectare: 2,
      crop_type: 'tebu',
      created_at: before.body.data.created_at,
    });
    expect(res.body.data.updated_at).not.toBe(before.body.data.updated_at);
  });

  it('rejects a missing name with 400', async () => {
    const res = await request(app)
      .put(`/farms/${farmId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ location: 'X' });
    expectErrorEnvelope(res, 400, 'VALIDATION_ERROR');
  });

  it('returns 404 for a nonexistent id', async () => {
    const res = await request(app)
      .put('/farms/999999')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Ghost Farm' });
    expectErrorEnvelope(res, 404, 'NOT_FOUND');
  });

  it('requires auth and leaves the record unchanged', async () => {
    const before = await request(app).get(`/farms/${farmId}`);
    const res = await request(app).put(`/farms/${farmId}`).send({ name: 'No Auth' });
    expectErrorEnvelope(res, 401, 'UNAUTHORIZED');
    const after = await request(app).get(`/farms/${farmId}`);
    expect(after.body.data).toEqual(before.body.data);
  });
});

describe('DELETE /farms/:id', () => {
  let farmId;

  beforeAll(async () => {
    const res = await request(app)
      .post('/farms')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'To Delete' });
    farmId = res.body.data.id;
  });

  it('requires auth and leaves the record in place', async () => {
    const res = await request(app).delete(`/farms/${farmId}`);
    expectErrorEnvelope(res, 401, 'UNAUTHORIZED');
    const stillThere = await request(app).get(`/farms/${farmId}`);
    expect(stillThere.status).toBe(200);
  });

  it('deletes the farm and returns 204 with an empty body', async () => {
    const res = await request(app)
      .delete(`/farms/${farmId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(204);
    expect(res.body).toEqual({});
    expect(res.text).toBe('');
  });

  it('returns 404 on subsequent GET after deletion', async () => {
    const res = await request(app).get(`/farms/${farmId}`);
    expectErrorEnvelope(res, 404, 'NOT_FOUND');
  });

  it('returns 404 when deleting the same id again', async () => {
    const res = await request(app)
      .delete(`/farms/${farmId}`)
      .set('Authorization', `Bearer ${token}`);
    expectErrorEnvelope(res, 404, 'NOT_FOUND');
  });

  it('returns 404 for a nonexistent id', async () => {
    const res = await request(app).delete('/farms/999999').set('Authorization', `Bearer ${token}`);
    expectErrorEnvelope(res, 404, 'NOT_FOUND');
  });
});

describe('cross-cutting envelope consistency', () => {
  it('returns a 404 envelope for an unknown route', async () => {
    const res = await request(app).get('/nope');
    expectErrorEnvelope(res, 404, 'NOT_FOUND');
  });

  it('returns a 404 envelope for an unsupported method on a known path', async () => {
    const res = await request(app).patch('/farms/1');
    expectErrorEnvelope(res, 404, 'NOT_FOUND');
  });
});
