import { Router } from 'express';
import * as farmsController from '../controllers/farms.controller.js';
import { requireAuth } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import { farmBodySchema, farmIdParamSchema } from '../schemas/farm.schema.js';

const router = Router();

router.get('/', farmsController.listFarms);
router.get('/:id', validate(farmIdParamSchema, 'params'), farmsController.getFarm);
router.post('/', requireAuth, validate(farmBodySchema, 'body'), farmsController.createFarm);
router.put(
  '/:id',
  requireAuth,
  validate(farmIdParamSchema, 'params'),
  validate(farmBodySchema, 'body'),
  farmsController.updateFarm,
);
router.delete('/:id', requireAuth, validate(farmIdParamSchema, 'params'), farmsController.deleteFarm);

export default router;
