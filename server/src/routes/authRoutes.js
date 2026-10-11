import { Router } from 'express';
import { changeOwnPassword, login, register, me, listRoles } from '../controllers/authController.js';
import { authenticate, requirePermission } from '../middlewares/auth.js';
import { loginRateLimit } from '../middlewares/rateLimits.js';

const router = Router();

router.post('/login', loginRateLimit, login);
router.post('/register', authenticate, requirePermission('users.create'), register);
router.get('/me', authenticate, me);
router.patch('/password', authenticate, changeOwnPassword);
router.get('/roles', authenticate, requirePermission('roles.view'), listRoles);

export default router;
