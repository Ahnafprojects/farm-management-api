import { Router } from 'express';
import * as farmsController from '../controllers/farms.controller.js';

const router = Router();

router.get('/', farmsController.listFarms);
router.get('/:id', farmsController.getFarm);
router.post('/', farmsController.createFarm);
router.put('/:id', farmsController.updateFarm);
router.delete('/:id', farmsController.deleteFarm);

export default router;
