import { Router } from 'express';
import {
  listMaintenance,
  createMaintenance,
  updateMaintenance,
  deleteMaintenance,
  bulkCreateMaintenance,
  listIncidents,
  createIncident,
  updateIncident,
  deleteIncident,
  bulkCreateIncident,
  listLicenses,
  listContracts,
  createContract,
  updateContract,
  deleteContract,
  createLicense,
  updateLicense,
  deleteLicense,
  listQualityControls,
  createQualityControl,
  updateQualityControl,
  deleteQualityControl,
  listDicomConfigs,
  upsertDicomConfig,
  deleteDicomConfig,
  listSchedule,
  createSchedule,
  deleteSchedule,
  updateSchedule,
  listNotifications,
  getDashboard,
} from '../controllers/operationsController.js';
import { authenticate, requirePermission } from '../middlewares/auth.js';

const router = Router();

router.use(authenticate);

router.get('/dashboard', requirePermission('dashboard.view'), getDashboard);
router.get('/maintenance', requirePermission('maintenance.view'), listMaintenance);
router.post('/maintenance', requirePermission('maintenance.create'), createMaintenance);
router.post('/maintenance/bulk', requirePermission('maintenance.create'), bulkCreateMaintenance);
router.put('/maintenance/:id', requirePermission('maintenance.update'), updateMaintenance);
router.delete('/maintenance/:id', requirePermission('maintenance.delete'), deleteMaintenance);
router.get('/incidents', requirePermission('incidents.view'), listIncidents);
router.post('/incidents', requirePermission('incidents.create'), createIncident);
router.post('/incidents/bulk', requirePermission('incidents.create'), bulkCreateIncident);
router.put('/incidents/:id', requirePermission('incidents.update'), updateIncident);
router.delete('/incidents/:id', requirePermission('incidents.delete'), deleteIncident);
router.get('/licenses', requirePermission('licenses.view'), listLicenses);
router.get('/contracts', requirePermission('contracts.view'), listContracts);
router.post('/contracts', requirePermission('contracts.create'), createContract);
router.put('/contracts/:id', requirePermission('contracts.update'), updateContract);
router.delete('/contracts/:id', requirePermission('contracts.delete'), deleteContract);
router.post('/licenses', requirePermission('licenses.create'), createLicense);
router.put('/licenses/:id', requirePermission('licenses.update'), updateLicense);
router.delete('/licenses/:id', requirePermission('licenses.delete'), deleteLicense);
router.get('/quality-controls', requirePermission('quality_controls.view'), listQualityControls);
router.post('/quality-controls', requirePermission('quality_controls.create'), createQualityControl);
router.put('/quality-controls/:id', requirePermission('quality_controls.update'), updateQualityControl);
router.delete('/quality-controls/:id', requirePermission('quality_controls.delete'), deleteQualityControl);
router.get('/dicom', requirePermission('dicom.view'), listDicomConfigs);
router.post('/dicom', requirePermission('dicom.update'), upsertDicomConfig);
router.delete('/dicom/:equipmentId', requirePermission('dicom.delete'), deleteDicomConfig);
router.get('/schedule', requirePermission('schedule.view'), listSchedule);
router.post('/schedule', requirePermission('schedule.create'), createSchedule);
router.put('/schedule/:id', requirePermission('schedule.update'), updateSchedule);
router.delete('/schedule/:id', requirePermission('schedule.delete'), deleteSchedule);
router.get('/notifications', requirePermission('dashboard.view'), listNotifications);

export default router;
