import { db } from '../db/connection.js';

/**
 * Finds a user by email.
 * @param {string} email
 * @returns {object|undefined}
 */
export function findByEmail(email) {
  return db
    .prepare('SELECT id, email, password_hash, created_at FROM users WHERE email = ?')
    .get(email);
}

/**
 * Inserts a new user and returns the created row (without password_hash).
 * @param {{ email: string, passwordHash: string }} data
 * @returns {{ id: number, email: string }}
 */
export function create({ email, passwordHash }) {
  const now = new Date().toISOString();
  const stmt = db.prepare(`
    INSERT INTO users (email, password_hash, created_at)
    VALUES (?, ?, ?)
  `);
  const result = stmt.run(email, passwordHash, now);
  return { id: result.lastInsertRowid, email };
}

export default { findByEmail, create };
