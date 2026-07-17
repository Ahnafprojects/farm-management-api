import { Router } from 'express';
import * as farmsController from '../controllers/farms.controller.js';
import { validate } from '../middlewares/validate.js';
import { farmBodySchema, farmIdParamSchema } from '../schemas/farm.schema.js';

const router = Router();

router.get('/', farmsController.listFarms);
router.get('/:id', validate(farmIdParamSchema, 'params'), farmsController.getFarm);
router.post('/', validate(farmBodySchema, 'body'), farmsController.createFarm);
router.put(
  '/:id',
  validate(farmIdParamSchema, 'params'),
  validate(farmBodySchema, 'body'),
  farmsController.updateFarm,
);
router.delete('/:id', validate(farmIdParamSchema, 'params'), farmsController.deleteFarm);

export default router;
