import '../src/db/schema.js';
import { db } from '../src/db/connection.js';

describe('seed script', () => {
  it('populates farms and a demo user when run', async () => {
    await import('../src/db/seed.js');

    const farmCount = db.prepare('SELECT COUNT(*) AS count FROM farms').get().count;
    const demoUser = db.prepare('SELECT email FROM users WHERE email = ?').get('demo@farmapi.dev');

    expect(farmCount).toBeGreaterThanOrEqual(12);
    expect(farmCount).toBeLessThanOrEqual(15);
    expect(demoUser).toMatchObject({ email: 'demo@farmapi.dev' });
  });
});
