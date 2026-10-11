import { z } from 'zod';

const itemSchema = z.object({
  concept: z.string().trim().min(1).max(200),
  amount: z.coerce.number().finite().min(0),
});

export const invoiceAuditSchema = z.object({
  period: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
  company: z.string().trim().min(1).max(200),
  equipmentId: z.coerce.number().int().positive().optional().nullable(),
  service: z.string().trim().max(200).optional().nullable(),
  invoiceNumber: z.string().trim().max(100).optional().nullable(),
  invoiceDate: z.string().optional().nullable(),
  fixedMonthlyCost: z.coerce.number().finite().min(0),
  invoicedValue: z.coerce.number().finite().min(0),
  status: z.enum(['REVIEWED', 'APPROVED', 'WITH_ISSUE', 'NOT_SUBMITTED']).default('REVIEWED'),
  comment: z.string().optional().nullable(),
  thresholdPercent: z.coerce.number().finite().min(0).max(100).default(10),
  recurrenceMonths: z.coerce.number().int().min(1).max(60).optional().nullable(),
  recurrenceKey: z.string().trim().max(80).optional().nullable(),
  recurrenceIndex: z.coerce.number().int().min(1).optional().nullable(),
  items: z.array(itemSchema).default([]),
});
