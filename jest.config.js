export default {
  testEnvironment: 'node',
  setupFiles: ['<rootDir>/tests/env.setup.js'],
  testMatch: ['**/tests/**/*.test.js'],
  verbose: true,
  collectCoverageFrom: ['src/**/*.js', '!src/server.js'],
};
