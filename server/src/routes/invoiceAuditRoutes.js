import { Router } from 'express';
import { authenticate, requirePermission } from '../middlewares/auth.js';
import {
  createInvoiceAudit,
  deleteInvoiceAudit,
  getInvoiceAuditSummary,
  listInvoiceAudits,
  updateInvoiceAudit,
  updateInvoiceAuditStatus,
} from '../controllers/invoiceAuditController.js';

const router = Router();
router.use(authenticate);
router.get('/', requirePermission('invoice_audits.view'), listInvoiceAudits);
router.get('/summary', requirePermission('invoice_audits.view'), getInvoiceAuditSummary);
router.post('/', requirePermission('invoice_audits.create'), createInvoiceAudit);
router.put('/:id', requirePermission('invoice_audits.update'), updateInvoiceAudit);
router.patch('/:id/status', requirePermission('invoice_audits.update'), updateInvoiceAuditStatus);
router.delete('/:id', requirePermission('invoice_audits.delete'), deleteInvoiceAudit);
export default router;
