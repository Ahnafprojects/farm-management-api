import { spawnSync } from 'node:child_process';
import path from 'node:path';

const configPath = path.join(process.cwd(), 'src', 'config', 'index.js');

describe('config fail-fast validation', () => {
  it('exits non-zero and logs a clear message when JWT_SECRET is missing', () => {
    const result = spawnSync(process.execPath, ['-e', `import('${pathToFileUrl(configPath)}')`], {
      env: { ...process.env, NODE_ENV: 'development', JWT_SECRET: '' },
      encoding: 'utf8',
    });
    expect(result.status).not.toBe(0);
    expect(result.stderr).toMatch(/JWT_SECRET/);
  });

  it('exits non-zero in production when JWT_SECRET is weak', () => {
    const result = spawnSync(process.execPath, ['-e', `import('${pathToFileUrl(configPath)}')`], {
      env: {
        ...process.env,
        NODE_ENV: 'production',
        JWT_SECRET: 'short',
        CORS_ORIGIN: 'https://example.com',
      },
      encoding: 'utf8',
    });
    expect(result.status).not.toBe(0);
    expect(result.stderr).toMatch(/JWT_SECRET/);
  });

  it('exits non-zero in production when CORS_ORIGIN is the wildcard', () => {
    const result = spawnSync(process.execPath, ['-e', `import('${pathToFileUrl(configPath)}')`], {
      env: {
        ...process.env,
        NODE_ENV: 'production',
        JWT_SECRET: 'a-sufficiently-long-production-secret',
        CORS_ORIGIN: '*',
      },
      encoding: 'utf8',
    });
    expect(result.status).not.toBe(0);
    expect(result.stderr).toMatch(/CORS_ORIGIN/);
  });
});

function pathToFileUrl(p) {
  return new URL(`file://${p}`).href;
}
