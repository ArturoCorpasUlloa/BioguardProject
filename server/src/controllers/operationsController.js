import { prisma, serializeBigInt } from '../utils/prisma.js';
import { asyncHandler, AppError } from '../utils/asyncHandler.js';
import {
  contractSchema,
  dicomSchema,
  licenseSchema,
  maintenanceSchema,
  incidentSchema,
  parseDate,
  qualityControlSchema,
  toInt,
  bulkMaintenanceSchema,
  bulkIncidentSchema,
} from '../validators/schemas.js';

function parseScheduleDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new AppError('La fecha programada debe tener el formato AAAA-MM-DD', 400);
  }
  const date = parseDate(value);
  if (!date) {
    throw new AppError('La fecha programada no es válida', 400);
  }
  return date;
}

export const listMaintenance = asyncHandler(async (req, res) => {
  const { equipmentId, type, status } = req.query;

  const items = await prisma.maintenance.findMany({
    where: {
      equipmentId: equipmentId ? Number(equipmentId) : undefined,
      type: type || undefined,
      status: status || undefined,
    },
    include: {
      equipment: { include: { area: true } },
      technician: true,
      documents: true,
    },
    orderBy: { scheduledDate: 'desc' },
  });

  res.json(serializeBigInt(items));
});

export const createMaintenance = asyncHandler(async (req, res) => {
  const data = maintenanceSchema.parse(req.body);

  const item = await prisma.maintenance.create({
    data: {
      equipmentId: Number(data.equipmentId),
      type: data.type || 'PREVENTIVE',
      status: data.status || 'SCHEDULED',
      scheduledDate: parseDate(data.scheduledDate),
      executionDate: parseDate(data.executionDate),
      technicianId: req.user.id,
      responsible: data.responsible,
      company: data.company,
      description: data.description,
      workPerformed: data.workPerformed,
      spareParts: data.spareParts,
      cost: data.cost,
      nextMaintenanceDate: parseDate(data.nextMaintenanceDate),
      observations: data.observations,
    },
    include: { equipment: true, documents: true },
  });

  res.status(201).json(serializeBigInt(item));
});

export const updateMaintenance = asyncHandler(async (req, res) => {
  const data = maintenanceSchema.partial().parse(req.body);
  const item = await prisma.maintenance.update({
    where: { id: Number(req.params.id) },
    data: {
      equipmentId: data.equipmentId === undefined ? undefined : Number(data.equipmentId),
      type: data.type,
      status: data.status,
      scheduledDate: data.scheduledDate === undefined ? undefined : parseDate(data.scheduledDate),
      executionDate: data.executionDate === undefined ? undefined : parseDate(data.executionDate),
      responsible: data.responsible,
      company: data.company,
      description: data.description,
      workPerformed: data.workPerformed,
      spareParts: data.spareParts,
      cost: data.cost,
      nextMaintenanceDate: data.nextMaintenanceDate === undefined ? undefined : parseDate(data.nextMaintenanceDate),
      observations: data.observations,
    },
    include: { equipment: true, documents: true },
  });

  res.json(serializeBigInt(item));
});

export const deleteMaintenance = asyncHandler(async (req, res) => {
  await prisma.maintenance.delete({ where: { id: Number(req.params.id) } });
  res.status(204).send();
});

export const bulkCreateMaintenance = asyncHandler(async (req, res) => {
  const { records } = bulkMaintenanceSchema.parse(req.body);
  const created = await prisma.$transaction(records.map((data) => prisma.maintenance.create({
    data: {
      equipmentId: Number(data.equipmentId), type: data.type || 'PREVENTIVE', status: data.status || 'SCHEDULED',
      scheduledDate: parseDate(data.scheduledDate), executionDate: parseDate(data.executionDate),
      technicianId: req.user.id, responsible: data.responsible, company: data.company,
      description: data.description, workPerformed: data.workPerformed, spareParts: data.spareParts,
      cost: data.cost, nextMaintenanceDate: parseDate(data.nextMaintenanceDate), observations: data.observations,
    },
  })));
  res.status(201).json(serializeBigInt(created));
});

export const listIncidents = asyncHandler(async (req, res) => {
  const { equipmentId, status, priority } = req.query;

  const items = await prisma.incident.findMany({
    where: {
      equipmentId: equipmentId ? Number(equipmentId) : undefined,
      status: status || undefined,
      priority: priority || undefined,
    },
    include: {
      equipment: { include: { area: true } },
      reportedBy: true,
      assignedTo: true,
    },
    orderBy: { reportedAt: 'desc' },
  });

  res.json(serializeBigInt(items));
});

export const createIncident = asyncHandler(async (req, res) => {
  const data = incidentSchema.parse(req.body);

  const item = await prisma.incident.create({
    data: {
      equipmentId: Number(data.equipmentId),
      reportedById: req.user.id,
      reporterName: data.reporterName,
      reportedAt: data.reportedAt === undefined ? undefined : parseDate(data.reportedAt),
      assignedToId: toInt(data.assignedToId),
      reportNumber: data.reportNumber,
      priority: data.priority || 'MEDIUM',
      status: data.status || 'REPORTED',
      description: data.description,
      solution: data.solution,
      observations: data.observations,
    },
    include: {
      equipment: true,
      reportedBy: true,
      assignedTo: true,
    },
  });

  res.status(201).json(serializeBigInt(item));
});

export const updateIncident = asyncHandler(async (req, res) => {
  const data = incidentSchema.partial().parse(req.body);
  const item = await prisma.incident.update({
    where: { id: Number(req.params.id) },
    data: {
      equipmentId: data.equipmentId === undefined ? undefined : Number(data.equipmentId),
      assignedToId: data.assignedToId === undefined ? undefined : toInt(data.assignedToId),
      reportNumber: data.reportNumber,
      reporterName: data.reporterName,
      reportedAt: data.reportedAt === undefined ? undefined : parseDate(data.reportedAt),
      priority: data.priority,
      status: data.status,
      description: data.description,
      solution: data.solution,
      observations: data.observations,
    },
    include: { equipment: true, reportedBy: true, assignedTo: true },
  });

  res.json(serializeBigInt(item));
});

export const deleteIncident = asyncHandler(async (req, res) => {
  await prisma.incident.delete({ where: { id: Number(req.params.id) } });
  res.status(204).send();
});

export const bulkCreateIncident = asyncHandler(async (req, res) => {
  const { records } = bulkIncidentSchema.parse(req.body);
  const created = await prisma.$transaction(records.map((data) => prisma.incident.create({
    data: {
      equipmentId: Number(data.equipmentId), reportedById: req.user.id, reporterName: data.reporterName,
      reportedAt: data.reportedAt === undefined ? undefined : parseDate(data.reportedAt),
      assignedToId: data.assignedToId === undefined ? undefined : toInt(data.assignedToId),
      reportNumber: data.reportNumber, priority: data.priority || 'MEDIUM', status: data.status || 'REPORTED',
      description: data.description, solution: data.solution, observations: data.observations,
    },
  })));
  res.status(201).json(serializeBigInt(created));
});

export const listLicenses = asyncHandler(async (_req, res) => {
  const items = await prisma.license.findMany({
    include: { equipment: { include: { area: true } } },
    orderBy: { expirationDate: 'asc' },
  });
  res.json(serializeBigInt(items));
});

export const listContracts = asyncHandler(async (_req, res) => {
  const items = await prisma.contract.findMany({
    include: { equipment: { include: { area: true } } },
    orderBy: { endDate: 'asc' },
  });
  res.json(serializeBigInt(items));
});

function operationId(req) {
  return Number(req.params.id);
}

function partsFromContractType(contractType) {
  if (contractType === 'WITH_PARTS') return true;
  if (contractType === 'LABOR_ONLY' || contractType === 'SERVICE_PROVISION') return false;
  return null;
}

  export const createContract = asyncHandler(async (req, res) => {
    const data = contractSchema.parse(req.body);
    const item = await prisma.contract.create({
      data: {
        ...data,
        equipmentId: Number(data.equipmentId),
        startDate: parseDate(data.startDate),
        endDate: parseDate(data.endDate),
        automaticRenewal: data.automaticRenewal ?? null,
        withParts: partsFromContractType(data.contractType) ?? data.withParts ?? null,
        cost: data.cost === undefined ? undefined : Number(data.cost),
      },
      include: { equipment: true },
    });
    res.status(201).json(serializeBigInt(item));
  });

  export const updateContract = asyncHandler(async (req, res) => {
    const data = contractSchema.partial().parse(req.body);
    const item = await prisma.contract.update({
      where: { id: operationId(req) },
      data: {
        ...data,
        equipmentId: data.equipmentId === undefined ? undefined : Number(data.equipmentId),
        startDate: data.startDate === undefined ? undefined : parseDate(data.startDate),
        endDate: data.endDate === undefined ? undefined : parseDate(data.endDate),
        automaticRenewal: data.automaticRenewal === undefined ? undefined : data.automaticRenewal,
        withParts: data.contractType === undefined
          ? (data.withParts === undefined ? undefined : data.withParts)
          : partsFromContractType(data.contractType),
        cost: data.cost === undefined ? undefined : Number(data.cost),
      },
      include: { equipment: true },
    });
    res.json(serializeBigInt(item));
  });

  export const deleteContract = asyncHandler(async (req, res) => {
    await prisma.contract.delete({ where: { id: operationId(req) } });
    res.status(204).send();
  });

  export const createLicense = asyncHandler(async (req, res) => {
    const data = licenseSchema.parse(req.body);
    const item = await prisma.license.create({
      data: {
        ...data,
        equipmentId: Number(data.equipmentId),
        initialDate: parseDate(data.initialDate),
        issueDate: parseDate(data.issueDate),
        tramitDate: parseDate(data.tramitDate),
        expirationDate: parseDate(data.expirationDate),
      },
      include: { equipment: true },
    });
    res.status(201).json(serializeBigInt(item));
  });

  export const updateLicense = asyncHandler(async (req, res) => {
    const data = licenseSchema.partial().parse(req.body);
    const item = await prisma.license.update({
      where: { id: operationId(req) },
      data: {
        ...data,
        equipmentId: data.equipmentId === undefined ? undefined : Number(data.equipmentId),
        initialDate: data.initialDate === undefined ? undefined : parseDate(data.initialDate),
        issueDate: data.issueDate === undefined ? undefined : parseDate(data.issueDate),
        tramitDate: data.tramitDate === undefined ? undefined : parseDate(data.tramitDate),
        expirationDate: data.expirationDate === undefined ? undefined : parseDate(data.expirationDate),
      },
      include: { equipment: true },
    });
    res.json(serializeBigInt(item));
  });

  export const deleteLicense = asyncHandler(async (req, res) => {
    await prisma.license.delete({ where: { id: operationId(req) } });
    res.status(204).send();
  });
export const listQualityControls = asyncHandler(async (_req, res) => {
  const items = await prisma.qualityControl.findMany({
    include: { equipment: { include: { area: true } } },
    orderBy: { nextControlDate: 'asc' },
  });
  res.json(serializeBigInt(items));
});

  export const createQualityControl = asyncHandler(async (req, res) => {
    const data = qualityControlSchema.parse(req.body);
    const item = await prisma.qualityControl.create({
      data: {
        ...data,
        equipmentId: Number(data.equipmentId),
        controlDate: parseDate(data.controlDate),
        nextControlDate: parseDate(data.nextControlDate),
        cost: data.cost === undefined ? undefined : Number(data.cost),
      },
      include: { equipment: true },
    });
    res.status(201).json(serializeBigInt(item));
  });

  export const updateQualityControl = asyncHandler(async (req, res) => {
    const data = qualityControlSchema.partial().parse(req.body);
    const item = await prisma.qualityControl.update({
      where: { id: operationId(req) },
      data: {
        ...data,
        equipmentId: data.equipmentId === undefined ? undefined : Number(data.equipmentId),
        controlDate: data.controlDate === undefined ? undefined : parseDate(data.controlDate),
        nextControlDate: data.nextControlDate === undefined ? undefined : parseDate(data.nextControlDate),
        cost: data.cost === undefined ? undefined : Number(data.cost),
      },
      include: { equipment: true },
    });
    res.json(serializeBigInt(item));
  });

  export const deleteQualityControl = asyncHandler(async (req, res) => {
    await prisma.qualityControl.delete({ where: { id: operationId(req) } });
    res.status(204).send();
  });
export const listDicomConfigs = asyncHandler(async (_req, res) => {
  const equipmentRows = await prisma.equipment.findMany({ select: { id: true } });
  const equipmentIds = equipmentRows.map(({ id }) => id);
  const items = equipmentIds.length === 0
    ? []
    : await prisma.dicomConfig.findMany({
      where: { equipmentId: { in: equipmentIds } },
      include: { equipment: { include: { area: true } } },
      orderBy: { updatedAt: 'desc' },
    });

  const safeItems = items.map(({ encryptedPassword, ...rest }) => ({
    ...rest,
    hasPassword: Boolean(encryptedPassword),
  }));

  res.json(serializeBigInt(safeItems));
});

export const upsertDicomConfig = asyncHandler(async (req, res) => {
  const data = dicomSchema.parse(req.body);
  const { password, ...configData } = data;
  const item = await prisma.dicomConfig.upsert({
    where: { equipmentId: Number(data.equipmentId) },
    create: {
      ...configData,
      equipmentId: Number(data.equipmentId),
      port: data.port || null,
      risPort: data.risPort || null,
      pacsPort: data.pacsPort || null,
      encryptedPassword: password || null,
    },
    update: {
      aeTitle: data.aeTitle,
      risAeTitle: data.risAeTitle,
      pacsAeTitle: data.pacsAeTitle,
      ipAddress: data.ipAddress,
      risIpAddress: data.risIpAddress,
      pacsIpAddress: data.pacsIpAddress,
      port: data.port || null,
      risPort: data.risPort || null,
      pacsPort: data.pacsPort || null,
      anidesk: data.anidesk,
      username: data.username,
      encryptedPassword: password || undefined,
      observations: data.observations,
    },
    include: { equipment: true },
  });
  const { encryptedPassword, ...safeItem } = item;
  res.json(serializeBigInt({ ...safeItem, hasPassword: Boolean(encryptedPassword) }));
});

export const deleteDicomConfig = asyncHandler(async (req, res) => {
  await prisma.dicomConfig.delete({ where: { equipmentId: Number(req.params.equipmentId) } });
  res.status(204).send();
});

export const listSchedule = asyncHandler(async (req, res) => {
  const { year, areaId, type } = req.query;
  const targetYear = year ? Number(year) : new Date().getFullYear();

  const start = new Date(`${targetYear}-01-01`);
  const end = new Date(`${targetYear + 1}-01-01`);

  const items = await prisma.maintenanceSchedule.findMany({
    where: {
      scheduledDate: { gte: start, lt: end },
      maintenanceType: type || undefined,
      equipment: areaId ? { areaId: Number(areaId) } : undefined,
    },
    include: {
      equipment: { include: { area: true } },
      responsible: true,
    },
    orderBy: { scheduledDate: 'asc' },
  });

  res.json(serializeBigInt(items));
});

export const createSchedule = asyncHandler(async (req, res) => {
  const { equipmentId, maintenanceType, scheduledDate, status, rescheduledDate, changeJustification, notes } = req.body;
  if (status === 'RESCHEDULED' && !rescheduledDate) {
    throw new Error('La fecha de reprogramación es obligatoria');
  }

  const item = await prisma.maintenanceSchedule.create({
    data: {
      equipmentId: Number(equipmentId),
      maintenanceType,
      scheduledDate: parseScheduleDate(scheduledDate),
      status: status || 'SCHEDULED',
      rescheduledDate: parseDate(rescheduledDate),
      changeJustification,
      responsibleId: req.user.id,
      notes,
    },
    include: {
      equipment: { include: { area: true } },
      responsible: true,
    },
  });

  res.status(201).json(serializeBigInt(item));
});

export const deleteSchedule = asyncHandler(async (req, res) => {
  await prisma.maintenanceSchedule.delete({ where: { id: Number(req.params.id) } });
  res.status(204).send();
});

export const updateSchedule = asyncHandler(async (req, res) => {
  const { equipmentId, maintenanceType, scheduledDate, status, rescheduledDate, changeJustification, notes } = req.body;
  if (status === 'RESCHEDULED' && !rescheduledDate) {
    throw new Error('La fecha de reprogramación es obligatoria');
  }
  const item = await prisma.maintenanceSchedule.update({
    where: { id: Number(req.params.id) },
    data: {
      equipmentId: equipmentId === undefined ? undefined : Number(equipmentId),
      maintenanceType, scheduledDate: scheduledDate === undefined ? undefined : parseScheduleDate(scheduledDate),
      status, rescheduledDate: rescheduledDate === undefined ? undefined : parseDate(rescheduledDate),
      changeJustification, notes,
    },
    include: { equipment: { include: { area: true } }, responsible: true },
  });
  res.json(serializeBigInt(item));
});

export const listNotifications = asyncHandler(async (req, res) => {
  const items = await prisma.notification.findMany({
    where: { userId: req.user.id },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
  res.json(serializeBigInt(items));
});

export const getDashboard = asyncHandler(async (_req, res) => {
  const today = new Date();
  const in30Days = new Date();
  in30Days.setDate(today.getDate() + 30);

  const [
    totalEquipment,
    activeEquipment,
    scheduledMaintenance,
    preventiveCount,
    correctiveCount,
    pendingMaintenance,
    criticalIncidents,
    expiringLicenses,
    pendingCalibrations,
    expiringContracts,
    expiringQualityControls,
    expiringDocuments,
    equipmentByStatus,
    maintenanceByEquipment,
  ] = await prisma.$transaction([
    prisma.equipment.count(),
    prisma.equipment.count({ where: { status: 'ACTIVE' } }),
    prisma.maintenanceSchedule.count({
      where: { status: { in: ['SCHEDULED', 'RESCHEDULED'] } },
    }),
    prisma.maintenance.count({ where: { type: 'PREVENTIVE' } }),
    prisma.maintenance.count({ where: { type: 'CORRECTIVE' } }),
    prisma.maintenanceSchedule.count({
      where: { status: { in: ['SCHEDULED', 'RESCHEDULED'] } },
    }),
    prisma.incident.count({
      where: { priority: { in: ['HIGH', 'CRITICAL'] } },
    }),
    prisma.license.count({
      where: {
        expirationDate: { lte: in30Days, gte: today },
      },
    }),
    prisma.calibration.count({
      where: {
        nextCalibrationDate: { lte: in30Days, gte: today },
      },
    }),
    prisma.contract.count({
      where: {
        endDate: { lte: in30Days },
      },
    }),
    prisma.qualityControl.count({
      where: { nextControlDate: { lte: in30Days, gte: today } },
    }),
    prisma.equipmentDocument.count({
      where: { expirationDate: { lte: in30Days, gte: today } },
    }),
    prisma.equipment.groupBy({
      by: ['status'],
      _count: { _all: true },
    }),
    prisma.maintenance.groupBy({
      by: ['equipmentId'],
      _count: { _all: true },
    }),
  ]);

  const equipmentForMaintenanceChart = await prisma.equipment.findMany({
    where: { id: { in: maintenanceByEquipment.map((item) => item.equipmentId) } },
    select: { id: true, name: true, inventoryCode: true, serialNumber: true },
  });
  const equipmentMap = Object.fromEntries(equipmentForMaintenanceChart.map((item) => [item.id, item]));
  const [criticalIncidentItems, expiringContractItems, expiringLicenseItems, expiringQualityItems, expiringDocumentItems] = await prisma.$transaction([
    prisma.incident.findMany({
      where: { priority: { in: ['HIGH', 'CRITICAL'] } },
      include: { equipment: true },
      orderBy: { reportedAt: 'desc' },
    }),
    prisma.contract.findMany({
      where: { endDate: { lte: in30Days } },
      include: { equipment: true },
      orderBy: { endDate: 'asc' },
    }),
    prisma.license.findMany({
      where: { expirationDate: { lte: in30Days, gte: today } },
      include: { equipment: true },
      orderBy: { expirationDate: 'asc' },
    }),
    prisma.qualityControl.findMany({
      where: { nextControlDate: { lte: in30Days, gte: today } },
      include: { equipment: true },
      orderBy: { nextControlDate: 'asc' },
    }),
    prisma.equipmentDocument.findMany({
      where: { expirationDate: { lte: in30Days, gte: today } },
      include: { equipment: true },
      orderBy: { expirationDate: 'asc' },
    }),
  ]);

  res.json(
    serializeBigInt({
      totals: {
        equipment: totalEquipment,
        activeEquipment,
        scheduledMaintenance,
        preventiveCount,
        correctiveCount,
        pendingMaintenance,
        criticalIncidents,
        expiringLicenses,
        pendingCalibrations,
        expiringContracts,
        expiringQualityControls,
        expiringDocuments,
      },
      alerts: {
        criticalIncidents: criticalIncidentItems,
        expiringContracts: expiringContractItems,
        expiringLicenses: expiringLicenseItems,
        expiringQualityControls: expiringQualityItems,
        expiringDocuments: expiringDocumentItems,
      },
      charts: {
        equipmentByStatus: equipmentByStatus.map((item) => ({
          status: item.status,
          count: item._count._all,
        })),
        equipmentByMaintenance: maintenanceByEquipment.map((item) => ({
          equipmentId: item.equipmentId,
          equipment: equipmentMap[item.equipmentId]?.name || `Equipo ${item.equipmentId}`,
          inventoryCode: equipmentMap[item.equipmentId]?.inventoryCode || equipmentMap[item.equipmentId]?.serialNumber || '',
          count: item._count._all,
        })),
      },
    })
  );
});
