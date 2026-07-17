import * as farmsService from '../services/farms.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/response.js';

export const listFarms = asyncHandler(async (req, res) => {
  const farms = farmsService.listFarms();
  sendSuccess(res, { message: 'Farms retrieved successfully', data: farms });
});

export const getFarm = asyncHandler(async (req, res) => {
  const farm = farmsService.getFarm(req.params.id);
  sendSuccess(res, { message: 'Farm retrieved successfully', data: farm });
});

export const createFarm = asyncHandler(async (req, res) => {
  const farm = farmsService.createFarm(req.body);
  res.location(`/farms/${farm.id}`);
  sendSuccess(res, { statusCode: 201, message: 'Farm created successfully', data: farm });
});

export const updateFarm = asyncHandler(async (req, res) => {
  const farm = farmsService.updateFarm(req.params.id, req.body);
  sendSuccess(res, { message: 'Farm updated successfully', data: farm });
});

export const deleteFarm = asyncHandler(async (req, res) => {
  farmsService.deleteFarm(req.params.id);
  res.status(204).end();
});

export default { listFarms, getFarm, createFarm, updateFarm, deleteFarm };
