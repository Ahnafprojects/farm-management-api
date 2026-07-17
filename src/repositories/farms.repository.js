import { db } from '../db/connection.js';

/**
 * Returns every farm ordered by most recently created first.
 * @returns {object[]}
 */
export function findAll() {
  return db
    .prepare(
      `SELECT id, name, location, area_hectare, crop_type, created_at, updated_at
       FROM farms ORDER BY created_at DESC`,
    )
    .all();
}

/**
 * Finds a single farm by id.
 * @param {number} id
 * @returns {object|undefined}
 */
export function findById(id) {
  return db
    .prepare(
      `SELECT id, name, location, area_hectare, crop_type, created_at, updated_at
       FROM farms WHERE id = ?`,
    )
    .get(id);
}

/**
 * Inserts a new farm record and returns the created row.
 * @param {{ name: string, location?: string, area_hectare?: number, crop_type?: string }} data
 * @returns {object}
 */
export function create(data) {
  const now = new Date().toISOString();
  const stmt = db.prepare(`
    INSERT INTO farms (name, location, area_hectare, crop_type, created_at, updated_at)
    VALUES (@name, @location, @area_hectare, @crop_type, @created_at, @updated_at)
  `);
  const result = stmt.run({
    name: data.name,
    location: data.location ?? null,
    area_hectare: data.area_hectare ?? null,
    crop_type: data.crop_type ?? null,
    created_at: now,
    updated_at: now,
  });
  return findById(result.lastInsertRowid);
}

/**
 * Replaces an existing farm's fields (full-update semantics) and returns
 * the updated row, or undefined if no row with that id exists.
 * @param {number} id
 * @param {{ name: string, location?: string, area_hectare?: number, crop_type?: string }} data
 * @returns {object|undefined}
 */
export function update(id, data) {
  const existing = findById(id);
  if (!existing) return undefined;

  const now = new Date().toISOString();
  const stmt = db.prepare(`
    UPDATE farms
    SET name = @name, location = @location, area_hectare = @area_hectare,
        crop_type = @crop_type, updated_at = @updated_at
    WHERE id = @id
  `);
  stmt.run({
    id,
    name: data.name,
    location: data.location ?? null,
    area_hectare: data.area_hectare ?? null,
    crop_type: data.crop_type ?? null,
    updated_at: now,
  });
  return findById(id);
}

/**
 * Deletes a farm by id. Returns true if a row was deleted.
 * @param {number} id
 * @returns {boolean}
 */
export function remove(id) {
  const result = db.prepare('DELETE FROM farms WHERE id = ?').run(id);
  return result.changes > 0;
}

export default { findAll, findById, create, update, remove };
