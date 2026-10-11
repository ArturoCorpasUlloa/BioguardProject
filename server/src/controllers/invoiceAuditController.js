import { prisma } from '../utils/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { invoiceAuditSchema } from '../validators/invoiceAuditSchemas.js';
import { z } from 'zod';
import { randomUUID } from 'node:crypto';

function parseDate(value) {
  if (!value) return null;
  const date = new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T12:00:00.000Z` : value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function addMonths(period, amount) {
  const [year, month] = period.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1 + amount, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

function calculate(data) {
  const additionalTotal = data.items.reduce((total, item) => total + item.amount, 0);
  const expectedValue = data.fixedMonthlyCost + additionalTotal;
  const difference = data.invoicedValue - expectedValue;
  const variationPercent = expectedValue ? (difference / expectedValue) * 100 : 0;
  return { additionalTotal, expectedValue, difference, variationPercent };
}

function attentionReasons(item) {
  const reasons = [];
  if (item.status === 'NOT_SUBMITTED') reasons.push('No presentada por contabilidad');
  if (item.status === 'WITH_ISSUE') reasons.push('Factura con novedad');
  if (item.variationPercent > item.thresholdPercent) reasons.push(`Variación superior al ${item.thresholdPercent}%`);
  if (!item.company || !item.period || item.invoicedValue === null || item.invoicedValue === undefined) reasons.push('Información incompleta');
  if (item.status === 'REVIEWED') reasons.push('Pendiente de aprobación');
  return reasons;
}

function serialize(item) {
  return {
    ...item,
    attentionReasons: attentionReasons(item),
    attentionRequired: attentionReasons(item).length > 0,
  };
}

export const listInvoiceAudits = asyncHandler(async (req, res) => {
  const period = req.query.period;
  const items = await prisma.invoiceAudit.findMany({
    where: period ? { period } : undefined,
    include: { items: { orderBy: { id: 'asc' } } },
    orderBy: [{ period: 'desc' }, { invoiceDate: 'desc' }, { id: 'desc' }],
  });
  res.json(items.map(serialize));
});

export const createInvoiceAudit = asyncHandler(async (req, res) => {
  const data = invoiceAuditSchema.parse(req.body);
  const recurrenceMonths = data.recurrenceMonths || 1;
  const recurrenceKey = recurrenceMonths > 1 ? randomUUID() : null;
  const item = await prisma.$transaction(async (tx) => {
    let first;
    for (let index = 0; index < recurrenceMonths; index += 1) {
      const isFirst = index === 0;
      const rowData = {
        period: addMonths(data.period, index),
        company: data.company,
        equipmentId: data.equipmentId ?? null,
        service: data.service || null,
        invoiceNumber: isFirst ? data.invoiceNumber || null : null,
        invoiceDate: isFirst ? parseDate(data.invoiceDate) : null,
        fixedMonthlyCost: data.fixedMonthlyCost,
        ...calculate(isFirst ? data : { ...data, invoicedValue: 0, items: [] }),
        invoicedValue: isFirst ? data.invoicedValue : 0,
        status: isFirst ? data.status : 'NOT_SUBMITTED',
        comment: isFirst ? data.comment || null : null,
        thresholdPercent: data.thresholdPercent,
        recurrenceKey,
        recurrenceMonths: recurrenceMonths > 1 ? recurrenceMonths : null,
        recurrenceIndex: recurrenceMonths > 1 ? index + 1 : null,
        items: { create: isFirst ? data.items : [] },
      };
      const created = await tx.invoiceAudit.create({ data: rowData, include: { items: true } });
      if (!first) first = created;
    }
    return first;
  });
  res.status(201).json(serialize(item));
});

export const updateInvoiceAudit = asyncHandler(async (req, res) => {
  const data = invoiceAuditSchema.parse(req.body);
  const calculated = calculate(data);
  const item = await prisma.$transaction(async (tx) => {
    await tx.invoiceAuditItem.deleteMany({ where: { auditId: Number(req.params.id) } });
    return tx.invoiceAudit.update({
      where: { id: Number(req.params.id) },
      data: {
        period: data.period, company: data.company, equipmentId: data.equipmentId ?? null,
        service: data.service || null, invoiceNumber: data.invoiceNumber || null,
        invoiceDate: parseDate(data.invoiceDate), fixedMonthlyCost: data.fixedMonthlyCost,
        ...calculated, invoicedValue: data.invoicedValue, status: data.status,
        comment: data.comment || null, thresholdPercent: data.thresholdPercent,
        recurrenceKey: data.recurrenceKey || null,
        recurrenceMonths: data.recurrenceMonths || null,
        recurrenceIndex: data.recurrenceIndex || null,
        items: { create: data.items },
      },
      include: { items: true },
    });
  });
  res.json(serialize(item));
});

export const updateInvoiceAuditStatus = asyncHandler(async (req, res) => {
  const status = z.enum(['REVIEWED', 'APPROVED', 'WITH_ISSUE', 'NOT_SUBMITTED']).parse(req.body.status);
  const item = await prisma.invoiceAudit.update({
    where: { id: Number(req.params.id) },
    data: { status },
    include: { items: true },
  });
  res.json(serialize(item));
});

export const deleteInvoiceAudit = asyncHandler(async (req, res) => {
  await prisma.invoiceAudit.delete({ where: { id: Number(req.params.id) } });
  res.status(204).send();
});

export const getInvoiceAuditSummary = asyncHandler(async (req, res) => {
  const period = req.query.period;
  const items = await prisma.invoiceAudit.findMany({ where: period ? { period } : undefined });
  const summary = items.reduce((result, item) => ({
    total: result.total + 1,
    approved: result.approved + (item.status === 'APPROVED' ? 1 : 0),
    reviewed: result.reviewed + (item.status === 'REVIEWED' ? 1 : 0),
    withIssue: result.withIssue + (item.status === 'WITH_ISSUE' ? 1 : 0),
    notSubmitted: result.notSubmitted + (item.status === 'NOT_SUBMITTED' ? 1 : 0),
    fixedTotal: result.fixedTotal + item.fixedMonthlyCost,
    additionalTotal: result.additionalTotal + item.additionalTotal,
    expectedTotal: result.expectedTotal + item.expectedValue,
    invoicedTotal: result.invoicedTotal + item.invoicedValue,
    differenceTotal: result.differenceTotal + item.difference,
    attention: result.attention + (attentionReasons(item).length ? 1 : 0),
  }), { total: 0, approved: 0, reviewed: 0, withIssue: 0, notSubmitted: 0, fixedTotal: 0, additionalTotal: 0, expectedTotal: 0, invoicedTotal: 0, differenceTotal: 0, attention: 0 });
  res.json(summary);
});
