import * as farmsRepository from '../repositories/farms.repository.js';
import { ApiError } from '../utils/ApiError.js';

/**
 * Retrieves a paginated, filtered, sorted list of farms.
 * @param {object} query - validated query params (page, limit, filters, sort, order)
 * @returns {{ items: object[], meta: { page: number, limit: number, totalItems: number, totalPages: number } }}
 */
export function listFarms(query) {
  const { rows, totalItems } = farmsRepository.findMany(query);
  const totalPages = Math.ceil(totalItems / query.limit) || 0;
  return {
    items: rows,
    meta: {
      page: query.page,
      limit: query.limit,
      totalItems,
      totalPages,
    },
  };
}

/**
 * Retrieves a single farm by id, throwing a 404 ApiError if missing.
 * @param {number} id
 * @returns {object}
 */
export function getFarm(id) {
  const farm = farmsRepository.findById(id);
  if (!farm) {
    throw ApiError.notFound(`Farm with id ${id} not found`);
  }
  return farm;
}

/**
 * Creates a new farm record.
 * @param {object} data - validated farm payload
 * @returns {object} the created farm
 */
export function createFarm(data) {
  return farmsRepository.create(data);
}

/**
 * Fully updates an existing farm record, throwing a 404 ApiError if missing.
 * @param {number} id
 * @param {object} data - validated farm payload
 * @returns {object} the updated farm
 */
export function updateFarm(id, data) {
  const updated = farmsRepository.update(id, data);
  if (!updated) {
    throw ApiError.notFound(`Farm with id ${id} not found`);
  }
  return updated;
}

/**
 * Deletes a farm record, throwing a 404 ApiError if missing.
 * @param {number} id
 */
export function deleteFarm(id) {
  const deleted = farmsRepository.remove(id);
  if (!deleted) {
    throw ApiError.notFound(`Farm with id ${id} not found`);
  }
}

export default { listFarms, getFarm, createFarm, updateFarm, deleteFarm };
