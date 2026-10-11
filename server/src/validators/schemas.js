import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const registerSchema = z.object({
  name: z.string().min(2).max(150),
  email: z.string().email(),
  password: z.string().min(6),
  roleId: z.number().int(),
  active: z.boolean().optional(),
});

export const roleSchema = z.object({
  name: z.string().min(2).max(100),
  description: z.string().max(500).optional().nullable(),
  active: z.boolean().optional(),
  permissionKeys: z.array(z.string().min(1)).default([]),
});

export const passwordSchema = z.object({
  password: z.string().min(6).max(200),
});

export const selfPasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(200),
  confirmPassword: z.string().min(8).max(200),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Las contraseñas nuevas no coinciden',
  path: ['confirmPassword'],
});

export const areaSchema = z.object({
  name: z.string().min(2).max(150),
  code: z.string().max(50).optional().nullable(),
  location: z.string().max(200).optional().nullable(),
  responsible: z.string().max(150).optional().nullable(),
  active: z.boolean().optional(),
});

export const equipmentSchema = z.object({
  name: z.string().min(2).max(200),
  brand: z.string().min(1).max(150),
  model: z.string().max(150).optional().nullable(),
  serialNumber: z.string().min(1).max(150),
  inventoryCode: z.string().max(150).optional().nullable(),
  areaId: z.union([z.string(), z.number()]).optional().nullable(),
  location: z.string().max(200).optional().nullable(),
  status: z.string().max(50).optional(),
  riskClassification: z.string().max(50).optional().nullable(),
  manufacturer: z.string().max(200).optional().nullable(),
  importer: z.string().max(200).optional().nullable(),
  manufacturingYear: z.number().int().optional().nullable(),
  acquisitionDate: z.string().optional().nullable(),
  provider: z.string().max(200).optional().nullable(),
  modality: z.string().max(100).optional().nullable(),
  providerPhone: z.string().max(50).optional().nullable(),
  providerEmail: z.preprocess(
    (value) => (value === '' ? null : value),
    z.string().email().max(200).optional().nullable()
  ),
  providerContactPerson: z.string().max(200).optional().nullable(),
  warrantyExpiration: z.string().optional().nullable(),
  technicalResponsible: z.string().max(200).optional().nullable(),
  maintenanceFrequency: z.string().max(100).optional().nullable(),
  installationDate: z.string().optional().nullable(),
  usefulLifeYears: z.number().int().optional().nullable(),
  equipmentType: z.string().max(150).optional().nullable(),
  technology: z.string().max(150).optional().nullable(),
  powerSupply: z.string().max(150).optional().nullable(),
  voltage: z.string().max(100).optional().nullable(),
  power: z.string().max(100).optional().nullable(),
  invimaRegistration: z.string().max(150).optional().nullable(),
  invimaExpiration: z.string().optional().nullable(),
  photoPath: z.string().max(1000).optional().nullable(),
  observations: z.string().optional().nullable(),
  contract: z.object({
    contractNumber: z.string().max(100).optional().nullable(),
    startDate: z.string().optional().nullable(),
    endDate: z.string().optional().nullable(),
    company: z.string().optional().nullable(),
    cost: z.coerce.number().optional().nullable(),
    contractType: z.string().max(100).optional().nullable(),
    automaticRenewal: z.boolean().optional().nullable(),
    withParts: z.boolean().optional().nullable(),
    coverage: z.string().optional().nullable(),
    observations: z.string().optional().nullable(),
  }).optional(),
  license: z.object({
    licenseType: z.string().max(150).optional().nullable(),
    registrationNumber: z.string().optional().nullable(),
    initialDate: z.string().optional().nullable(),
    tramitDate: z.string().optional().nullable(),
    expirationDate: z.string().optional().nullable(),
  }).optional(),
  qualityControl: z.object({
    controlDate: z.string().optional().nullable(),
    nextControlDate: z.string().optional().nullable(),
    cost: z.coerce.number().optional().nullable(),
  }).optional(),
  calibration: z.object({
    lastCalibrationDate: z.string().optional().nullable(),
    nextCalibrationDate: z.string().optional().nullable(),
  }).optional(),
  dicom: z.object({
    aeTitle: z.string().optional().nullable(),
    risAeTitle: z.string().optional().nullable(),
    pacsAeTitle: z.string().optional().nullable(),
    ipAddress: z.string().optional().nullable(),
    risIpAddress: z.string().optional().nullable(),
    pacsIpAddress: z.string().optional().nullable(),
    port: z.number().int().optional().nullable(),
    risPort: z.number().int().optional().nullable(),
    pacsPort: z.number().int().optional().nullable(),
    anidesk: z.string().optional().nullable(),
    username: z.string().optional().nullable(),
    password: z.string().optional().nullable(),
    observations: z.string().optional().nullable(),
  }).optional(),
});

const operationBase = {
  equipmentId: z.union([z.string(), z.number()]),
  observations: z.string().optional().nullable(),
};

export const contractSchema = z.object({
  ...operationBase,
  contractNumber: z.string().max(100).optional().nullable(),
  company: z.string().min(1).max(200),
  contractType: z.string().max(100).optional().nullable(),
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
  automaticRenewal: z.boolean().optional().nullable(),
  withParts: z.boolean().optional().nullable(),
  cost: z.coerce.number().optional().nullable(),
  coverage: z.string().optional().nullable(),
  documentPath: z.string().max(1000).optional().nullable(),
});

export const licenseSchema = z.object({
  ...operationBase,
  licenseType: z.string().max(150).optional().nullable(),
  registrationNumber: z.string().max(150).optional().nullable(),
  initialDate: z.string().optional().nullable(),
  issueDate: z.string().optional().nullable(),
  tramitDate: z.string().optional().nullable(),
  expirationDate: z.string().optional().nullable(),
  documentPath: z.string().max(1000).optional().nullable(),
});

export const qualityControlSchema = z.object({
  ...operationBase,
  controlDate: z.string(),
  nextControlDate: z.string().optional().nullable(),
  result: z.string().max(100).optional().nullable(),
  responsible: z.string().max(150).optional().nullable(),
  cost: z.coerce.number().optional().nullable(),
  documentPath: z.string().max(1000).optional().nullable(),
});

export const dicomSchema = z.object({
  equipmentId: z.union([z.string(), z.number()]),
  aeTitle: z.string().max(100).optional().nullable(),
  risAeTitle: z.string().max(100).optional().nullable(),
  pacsAeTitle: z.string().max(100).optional().nullable(),
  ipAddress: z.string().max(100).optional().nullable(),
  risIpAddress: z.string().max(100).optional().nullable(),
  pacsIpAddress: z.string().max(100).optional().nullable(),
  port: z.number().int().optional().nullable(),
  risPort: z.number().int().optional().nullable(),
  pacsPort: z.number().int().optional().nullable(),
  anidesk: z.string().max(150).optional().nullable(),
  username: z.string().max(150).optional().nullable(),
  password: z.string().optional().nullable(),
  observations: z.string().optional().nullable(),
});

export const maintenanceSchema = z.object({
  equipmentId: z.union([z.string(), z.number()]),
  type: z.enum(['PREVENTIVE', 'CORRECTIVE', 'CALIBRATION', 'INSPECTION']).optional().default('PREVENTIVE'),
  status: z.string().optional().default('SCHEDULED'),
  scheduledDate: z.string().optional().nullable(),
  executionDate: z.string().optional().nullable(),
  company: z.string().max(200).optional().nullable(),
  responsible: z.string().max(150).optional().nullable(),
  description: z.string().optional().nullable(),
  workPerformed: z.string().optional().nullable(),
  spareParts: z.string().optional().nullable(),
  cost: z.coerce.number().optional().nullable(),
  nextMaintenanceDate: z.string().optional().nullable(),
  observations: z.string().optional().nullable(),
});

export const bulkMaintenanceSchema = z.object({
  records: z.array(maintenanceSchema).min(1),
});

export const documentTypeSchema = z.enum([
  'CONTRACT',
  'INVIMA',
  'LICENSE',
  'MAINTENANCE_REPORT',
  'QUALITY_CONTROL',
  'SCHEDULE',
  'OTHER',
]);

export const incidentSchema = z.object({
  equipmentId: z.union([z.string(), z.number()]),
  reportNumber: z.string().max(100).optional().nullable(),
  reporterName: z.string().max(150).optional().nullable(),
  reportedAt: z.string().optional().nullable(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  status: z.string().optional(),
  description: z.string().min(3),
  solution: z.string().optional().nullable(),
  observations: z.string().optional().nullable(),
  assignedToId: z.union([z.string(), z.number()]).optional().nullable(),
});

export const bulkIncidentSchema = z.object({
  records: z.array(incidentSchema).min(1),
});

export function parseDate(value) {
  if (!value) return null;
  const normalized = typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? `${value}T12:00:00.000Z`
    : value;
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function toInt(value) {
  if (value === null || value === undefined || value === '') return null;
  return Number(value);
}
