import * as farmsRepository from '../repositories/farms.repository.js';

/**
 * Retrieves every farm.
 * @returns {object[]}
 */
export function listFarms() {
  return farmsRepository.findAll();
}

/**
 * Retrieves a single farm by id, or undefined if it doesn't exist.
 * @param {number} id
 * @returns {object|undefined}
 */
export function getFarm(id) {
  return farmsRepository.findById(id);
}

/**
 * Creates a new farm record.
 * @param {object} data - farm payload
 * @returns {object} the created farm
 */
export function createFarm(data) {
  return farmsRepository.create(data);
}

/**
 * Fully updates an existing farm record.
 * @param {number} id
 * @param {object} data - farm payload
 * @returns {object|undefined} the updated farm, or undefined if it doesn't exist
 */
export function updateFarm(id, data) {
  return farmsRepository.update(id, data);
}

/**
 * Deletes a farm record.
 * @param {number} id
 * @returns {boolean} true if a row was deleted
 */
export function deleteFarm(id) {
  return farmsRepository.remove(id);
}

export default { listFarms, getFarm, createFarm, updateFarm, deleteFarm };
