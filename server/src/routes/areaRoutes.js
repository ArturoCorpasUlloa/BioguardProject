import { Router } from 'express';
import {
  listAreas,
  createArea,
  updateArea,
  deleteArea,
} from '../controllers/areaController.js';
import { authenticate, requirePermission } from '../middlewares/auth.js';

const router = Router();

router.use(authenticate);

router.get('/', requirePermission('areas.view'), listAreas);
router.post('/', requirePermission('areas.create'), createArea);
router.put('/:id', requirePermission('areas.update'), updateArea);
router.delete('/:id', requirePermission('areas.delete'), deleteArea);

export default router;
