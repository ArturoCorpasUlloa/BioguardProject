import { Router } from 'express';
import { authenticate, requirePermission } from '../middlewares/auth.js';
import { exportSql } from '../controllers/exportController.js';

const router = Router();

router.use(authenticate);
router.get('/sql', requirePermission('database_export.execute'), exportSql);

export default router;
