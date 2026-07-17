import { db } from '../db/connection.js';

const SORTABLE_COLUMNS = new Set(['name', 'area_hectare', 'created_at']);

/**
 * Builds the WHERE clause and bound params shared by count/list queries.
 * @param {{ location?: string, crop_type?: string, search?: string }} filters
 */
function buildWhereClause(filters) {
  const clauses = [];
  const params = {};

  if (filters.location) {
    clauses.push('location LIKE @location COLLATE NOCASE');
    params.location = `%${filters.location}%`;
  }
  if (filters.crop_type) {
    clauses.push('crop_type LIKE @crop_type COLLATE NOCASE');
    params.crop_type = `%${filters.crop_type}%`;
  }
  if (filters.search) {
    clauses.push('name LIKE @search COLLATE NOCASE');
    params.search = `%${filters.search}%`;
  }

  const where = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
  return { where, params };
}

/**
 * Returns a page of farms matching the given filters, plus the total count
 * of matching rows (for pagination metadata).
 * @param {{ page: number, limit: number, location?: string, crop_type?: string, search?: string, sort: string, order: string }} options
 * @returns {{ rows: object[], totalItems: number }}
 */
export function findMany({ page, limit, location, crop_type, search, sort, order }) {
  const { where, params } = buildWhereClause({ location, crop_type, search });
  const sortColumn = SORTABLE_COLUMNS.has(sort) ? sort : 'created_at';
  const sortOrder = order === 'asc' ? 'ASC' : 'DESC';
  const offset = (page - 1) * limit;

  const countStmt = db.prepare(`SELECT COUNT(*) AS total FROM farms ${where}`);
  const { total } = countStmt.get(params);

  const listStmt = db.prepare(`
    SELECT id, name, location, area_hectare, crop_type, created_at, updated_at
    FROM farms
    ${where}
    ORDER BY ${sortColumn} ${sortOrder}
    LIMIT @limit OFFSET @offset
  `);
  const rows = listStmt.all({ ...params, limit, offset });

  return { rows, totalItems: total };
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

export default { findMany, findById, create, update, remove };
