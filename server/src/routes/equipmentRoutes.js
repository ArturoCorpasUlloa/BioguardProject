import { Router } from 'express';
import {
  listEquipment,
  getEquipment,
  createEquipment,
  updateEquipment,
  deleteEquipment,
  uploadEquipmentFile,
  listEquipmentDocuments,
  downloadEquipmentDocument,
  deleteEquipmentDocument,
} from '../controllers/equipmentController.js';
import { authenticate, requirePermission } from '../middlewares/auth.js';
import multer from 'multer';
import { equipmentUploadDir } from '../utils/uploads.js';

const upload = multer({
  storage: multer.diskStorage({
    destination: equipmentUploadDir,
    filename: (_req, file, cb) => cb(null, `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')}`),
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => cb(null, file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf'),
});

const router = Router();

router.use(authenticate);

router.get('/', requirePermission('equipment.view'), listEquipment);
router.get('/:id', requirePermission('equipment.view'), getEquipment);
router.post('/', requirePermission('equipment.create'), createEquipment);
router.put('/:id', requirePermission('equipment.update'), updateEquipment);
router.post('/:id/files', requirePermission('equipment.create'), upload.single('file'), uploadEquipmentFile);
router.get('/:id/documents', requirePermission('equipment.view'), listEquipmentDocuments);
router.get('/:id/documents/:documentId/download', requirePermission('equipment.view'), downloadEquipmentDocument);
router.delete('/:id/documents/:documentId', requirePermission('equipment.delete'), deleteEquipmentDocument);
router.post('/:id/photo', requirePermission('equipment.update'), upload.single('photo'), uploadEquipmentFile);
router.delete('/:id', requirePermission('equipment.delete'), deleteEquipment);

export default router;
