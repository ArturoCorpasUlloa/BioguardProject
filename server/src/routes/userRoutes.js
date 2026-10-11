import { Router } from 'express';
import { authenticate, requirePermission } from '../middlewares/auth.js';
import {
  createRole,
  createUser,
  changeUserPassword,
  deleteRole,
  deleteUser,
  listPermissions,
  listRoles,
  listUsers,
  updateRole,
  updateUser,
} from '../controllers/userController.js';

const router = Router();
router.use(authenticate);

router.get('/users', requirePermission('users.view'), listUsers);
router.post('/users', requirePermission('users.create'), createUser);
router.put('/users/:id', requirePermission('users.update'), updateUser);
router.patch('/users/:id/password', requirePermission('users.update'), changeUserPassword);
router.delete('/users/:id', requirePermission('users.delete'), deleteUser);
router.get('/permissions', requirePermission('roles.view'), listPermissions);
router.get('/roles', requirePermission('roles.view'), listRoles);
router.post('/roles', requirePermission('roles.create'), createRole);
router.put('/roles/:id', requirePermission('roles.update'), updateRole);
router.delete('/roles/:id', requirePermission('roles.delete'), deleteRole);

export default router;
