import * as farmsService from '../services/farms.service.js';

export async function listFarms(req, res) {
  const farms = farmsService.listFarms();
  res.status(200).json({ success: true, message: 'Farms retrieved successfully', data: farms });
}

export async function getFarm(req, res) {
  const id = Number(req.params.id);
  const farm = farmsService.getFarm(id);
  if (!farm) {
    return res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: `Farm with id ${id} not found` },
    });
  }
  return res.status(200).json({ success: true, message: 'Farm retrieved successfully', data: farm });
}

export async function createFarm(req, res) {
  const farm = farmsService.createFarm(req.body);
  res
    .status(201)
    .location(`/farms/${farm.id}`)
    .json({ success: true, message: 'Farm created successfully', data: farm });
}

export async function updateFarm(req, res) {
  const id = Number(req.params.id);
  const farm = farmsService.updateFarm(id, req.body);
  if (!farm) {
    return res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: `Farm with id ${id} not found` },
    });
  }
  return res.status(200).json({ success: true, message: 'Farm updated successfully', data: farm });
}

export async function deleteFarm(req, res) {
  const id = Number(req.params.id);
  const deleted = farmsService.deleteFarm(id);
  if (!deleted) {
    return res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: `Farm with id ${id} not found` },
    });
  }
  return res.status(204).end();
}

export default { listFarms, getFarm, createFarm, updateFarm, deleteFarm };
