import { prisma, serializeBigInt } from '../utils/prisma.js';
import { asyncHandler, AppError } from '../utils/asyncHandler.js';
import { equipmentSchema, parseDate, toInt } from '../validators/schemas.js';
import path from 'path';
import { uploadDir } from '../utils/uploads.js';

function buildEquipmentData(data) {
  return {
    name: data.name,
    brand: data.brand,
    model: data.model,
    serialNumber: data.serialNumber,
    inventoryCode: data.inventoryCode,
    areaId: toInt(data.areaId),
    location: data.location,
    status: data.status || 'ACTIVE',
    riskClassification: data.riskClassification,
    manufacturer: data.manufacturer,
    importer: data.importer,
    manufacturingYear: data.manufacturingYear,
    acquisitionDate: parseDate(data.acquisitionDate),
    provider: data.provider,
    modality: data.modality,
    providerPhone: data.providerPhone,
    providerEmail: data.providerEmail,
    providerContactPerson: data.providerContactPerson,
    warrantyExpiration: parseDate(data.warrantyExpiration),
    technicalResponsible: data.technicalResponsible,
    maintenanceFrequency: data.maintenanceFrequency,
    installationDate: parseDate(data.installationDate),
    usefulLifeYears: data.usefulLifeYears,
    equipmentType: data.equipmentType,
    technology: data.technology,
    powerSupply: data.powerSupply,
    voltage: data.voltage,
    power: data.power,
    invimaRegistration: data.invimaRegistration,
    invimaExpiration: parseDate(data.invimaExpiration),
    photoPath: data.photoPath,
    observations: data.observations,
  };
}

export const listEquipment = asyncHandler(async (req, res) => {
  const { search, status, areaId } = req.query;

  const where = {
    AND: [
      search
        ? {
            OR: [
              { name: { contains: search } },
              { brand: { contains: search } },
              { model: { contains: search } },
              { serialNumber: { contains: search } },
              { inventoryCode: { contains: search } },
              { location: { contains: search } },
            ],
          }
        : {},
      status ? { status } : {},
      areaId ? { areaId: Number(areaId) } : {},
    ],
  };

  const equipment = await prisma.equipment.findMany({
    where,
    include: {
      area: true,
      _count: {
        select: {
          maintenances: true,
          incidents: true,
          licenses: true,
        },
      },
    },
    orderBy: { updatedAt: 'desc' },
  });

  res.json(serializeBigInt(equipment));
});

export const getEquipment = asyncHandler(async (req, res) => {
  const equipmentId = Number(req.params.id);
  const equipment = await prisma.$transaction(async (tx) => {
    const current = await tx.equipment.findUnique({
      where: { id: equipmentId },
      select: { id: true, provider: true, technicalResponsible: true },
    });
    if (!current) return null;

    const executedSchedules = await tx.maintenanceSchedule.findMany({
      where: { equipmentId, status: 'EXECUTED' },
      select: { maintenanceType: true, scheduledDate: true },
    });
    const existingMaintenances = await tx.maintenance.findMany({
      where: { equipmentId },
      select: { type: true, status: true, scheduledDate: true },
    });
    const existingKeys = new Set(existingMaintenances.map((item) => (
      `${item.type}|${item.status}|${item.scheduledDate?.toISOString().slice(0, 10)}`
    )));

    for (const schedule of executedSchedules) {
      const key = `${schedule.maintenanceType}|COMPLETED|${schedule.scheduledDate.toISOString().slice(0, 10)}`;
      if (existingKeys.has(key)) continue;
      await tx.maintenance.create({
        data: {
          equipmentId,
          type: schedule.maintenanceType,
          status: 'COMPLETED',
          scheduledDate: schedule.scheduledDate,
          executionDate: schedule.scheduledDate,
          company: current.provider,
          responsible: current.technicalResponsible,
          description: 'SE EJECUTA MANTENIMIENTO PREVENTIVO SEGUN LAS INDICACIONES DEL FABRICANTE.',
          cost: null,
        },
      });
      existingKeys.add(key);
    }

    return tx.equipment.findUnique({
      where: { id: equipmentId },
      include: {
        area: true,
        contracts: { orderBy: { endDate: 'desc' } },
        licenses: { orderBy: { expirationDate: 'desc' } },
        calibrations: { orderBy: { nextCalibrationDate: 'desc' }, take: 5 },
        qualityControls: { orderBy: { controlDate: 'desc' }, take: 5 },
        maintenances: {
          orderBy: { scheduledDate: 'desc' },
          include: { documents: true },
        },
        incidents: { orderBy: { reportedAt: 'desc' } },
        dicomConfig: true,
        blocks: { orderBy: { startDate: 'desc' }, take: 5 },
        documents: { orderBy: { createdAt: 'desc' } },
      },
    });
  });

  if (!equipment) {
    throw new AppError('Equipo no encontrado', 404);
  }

  res.json(serializeBigInt(equipment));
});

export const createEquipment = asyncHandler(async (req, res) => {
  const data = equipmentSchema.parse(req.body);
  const { contract, license, qualityControl, calibration, dicom, ...equipmentData } = data;
  const equipment = await prisma.$transaction(async (tx) => {
    const created = await tx.equipment.create({
      data: buildEquipmentData(equipmentData),
      include: { area: true },
    });

    if (contract?.company || contract?.startDate || contract?.endDate) {
      await tx.contract.create({
        data: {
          equipmentId: created.id,
          contractNumber: contract.contractNumber,
          company: contract.company || 'Sin especificar',
          contractType: contract.contractType,
          startDate: parseDate(contract.startDate),
          endDate: parseDate(contract.endDate),
          automaticRenewal: contract.automaticRenewal ?? null,
          withParts: contract.withParts ?? null,
          coverage: contract.coverage,
          observations: contract.observations,
          cost: contract.cost === undefined || contract.cost === null || contract.cost === '' ? null : Number(contract.cost),
        },
      });
    }
    if (license && Object.values(license).some((value) => value !== null && value !== undefined && value !== '')) {
      await tx.license.create({
        data: {
          equipmentId: created.id,
          licenseType: license.licenseType,
          registrationNumber: license.registrationNumber,
          initialDate: parseDate(license.initialDate),
          tramitDate: parseDate(license.tramitDate),
          expirationDate: parseDate(license.expirationDate),
        },
      });
    }
    if (qualityControl?.controlDate || qualityControl?.nextControlDate) {
      await tx.qualityControl.create({
        data: {
          equipmentId: created.id,
          controlDate: parseDate(qualityControl.controlDate) || new Date(),
          nextControlDate: parseDate(qualityControl.nextControlDate),
          cost: qualityControl.cost === undefined || qualityControl.cost === null || qualityControl.cost === '' ? null : Number(qualityControl.cost),
        },
      });
    }
    if (calibration?.lastCalibrationDate || calibration?.nextCalibrationDate) {
      await tx.calibration.create({
        data: {
          equipmentId: created.id,
          lastCalibrationDate: parseDate(calibration.lastCalibrationDate),
          nextCalibrationDate: parseDate(calibration.nextCalibrationDate),
        },
      });
    }
    if (dicom && Object.values(dicom).some((value) => value !== null && value !== undefined && value !== '')) {
      await tx.dicomConfig.create({
        data: {
          equipmentId: created.id,
          aeTitle: dicom.aeTitle,
          risAeTitle: dicom.risAeTitle,
          pacsAeTitle: dicom.pacsAeTitle,
          ipAddress: dicom.ipAddress,
          risIpAddress: dicom.risIpAddress,
          pacsIpAddress: dicom.pacsIpAddress,
          port: dicom.port,
          risPort: dicom.risPort,
          pacsPort: dicom.pacsPort,
          anidesk: dicom.anidesk,
          username: dicom.username,
          encryptedPassword: dicom.password,
          observations: dicom.observations,
        },
      });
    }

    return tx.equipment.findUnique({
      where: { id: created.id },
      include: { area: true, contracts: true, licenses: true, qualityControls: true, dicomConfig: true },
    });
  });
  res.status(201).json(serializeBigInt(equipment));
});

export const updateEquipment = asyncHandler(async (req, res) => {
  const data = equipmentSchema.partial().parse(req.body);
  const { contract, license, qualityControl, calibration, dicom, ...equipmentData } = data;
  const payload = {};

  if (equipmentData.name !== undefined) payload.name = equipmentData.name;
  if (equipmentData.brand !== undefined) payload.brand = equipmentData.brand;
  if (equipmentData.model !== undefined) payload.model = equipmentData.model;
  if (equipmentData.serialNumber !== undefined) payload.serialNumber = equipmentData.serialNumber;
  if (equipmentData.inventoryCode !== undefined) payload.inventoryCode = equipmentData.inventoryCode;
  if (equipmentData.areaId !== undefined) payload.areaId = toInt(equipmentData.areaId);
  if (equipmentData.location !== undefined) payload.location = equipmentData.location;
  if (equipmentData.status !== undefined) payload.status = equipmentData.status;
  if (equipmentData.riskClassification !== undefined) payload.riskClassification = equipmentData.riskClassification;
  if (equipmentData.manufacturer !== undefined) payload.manufacturer = equipmentData.manufacturer;
  if (equipmentData.importer !== undefined) payload.importer = equipmentData.importer;
  if (equipmentData.manufacturingYear !== undefined) payload.manufacturingYear = equipmentData.manufacturingYear;
  if (equipmentData.acquisitionDate !== undefined) payload.acquisitionDate = parseDate(equipmentData.acquisitionDate);
  if (equipmentData.provider !== undefined) payload.provider = equipmentData.provider;
  if (equipmentData.modality !== undefined) payload.modality = equipmentData.modality;
  if (equipmentData.providerPhone !== undefined) payload.providerPhone = equipmentData.providerPhone;
  if (equipmentData.providerEmail !== undefined) payload.providerEmail = equipmentData.providerEmail;
  if (equipmentData.providerContactPerson !== undefined) payload.providerContactPerson = equipmentData.providerContactPerson;
  if (equipmentData.warrantyExpiration !== undefined) payload.warrantyExpiration = parseDate(equipmentData.warrantyExpiration);
  if (equipmentData.technicalResponsible !== undefined) payload.technicalResponsible = equipmentData.technicalResponsible;
  if (equipmentData.maintenanceFrequency !== undefined) payload.maintenanceFrequency = equipmentData.maintenanceFrequency;
  if (equipmentData.installationDate !== undefined) payload.installationDate = parseDate(equipmentData.installationDate);
  if (equipmentData.usefulLifeYears !== undefined) payload.usefulLifeYears = equipmentData.usefulLifeYears;
  if (equipmentData.equipmentType !== undefined) payload.equipmentType = equipmentData.equipmentType;
  if (equipmentData.technology !== undefined) payload.technology = equipmentData.technology;
  if (equipmentData.powerSupply !== undefined) payload.powerSupply = equipmentData.powerSupply;
  if (equipmentData.voltage !== undefined) payload.voltage = equipmentData.voltage;
  if (equipmentData.power !== undefined) payload.power = equipmentData.power;
  if (equipmentData.invimaRegistration !== undefined) payload.invimaRegistration = equipmentData.invimaRegistration;
  if (equipmentData.invimaExpiration !== undefined) payload.invimaExpiration = parseDate(equipmentData.invimaExpiration);
  if (equipmentData.photoPath !== undefined) payload.photoPath = equipmentData.photoPath;
  if (equipmentData.observations !== undefined) payload.observations = equipmentData.observations;

  const equipment = await prisma.$transaction(async (tx) => {
    await tx.equipment.update({ where: { id: Number(req.params.id) }, data: payload });
    if (contract) {
      await tx.contract.deleteMany({ where: { equipmentId: Number(req.params.id) } });
      if (contract.company || contract.startDate || contract.endDate) {
        await tx.contract.create({
          data: {
            equipmentId: Number(req.params.id),
            contractNumber: contract.contractNumber,
            company: contract.company || 'Sin especificar',
            contractType: contract.contractType,
            startDate: parseDate(contract.startDate),
            endDate: parseDate(contract.endDate),
            automaticRenewal: contract.automaticRenewal ?? null,
            withParts: contract.withParts ?? null,
            coverage: contract.coverage,
            observations: contract.observations,
            cost: contract.cost === undefined || contract.cost === null || contract.cost === '' ? null : Number(contract.cost),
          },
        });
      }
    }
    if (license) {
      await tx.license.deleteMany({ where: { equipmentId: Number(req.params.id) } });
      if (Object.values(license).some((value) => value !== null && value !== undefined && value !== '')) {
        await tx.license.create({ data: {
          equipmentId: Number(req.params.id),
          licenseType: license.licenseType,
          registrationNumber: license.registrationNumber,
          initialDate: parseDate(license.initialDate),
          tramitDate: parseDate(license.tramitDate),
          expirationDate: parseDate(license.expirationDate),
        } });
      }
    }
    if (qualityControl) {
      await tx.qualityControl.deleteMany({ where: { equipmentId: Number(req.params.id) } });
      if (qualityControl.controlDate || qualityControl.nextControlDate) {
        await tx.qualityControl.create({
          data: {
            equipmentId: Number(req.params.id),
            controlDate: parseDate(qualityControl.controlDate) || new Date(),
            nextControlDate: parseDate(qualityControl.nextControlDate),
            cost: qualityControl.cost === undefined || qualityControl.cost === null || qualityControl.cost === '' ? null : Number(qualityControl.cost),
          },
        });
      }
    }
    if (calibration) {
      await tx.calibration.deleteMany({ where: { equipmentId: Number(req.params.id) } });
      if (calibration.lastCalibrationDate || calibration.nextCalibrationDate) {
        await tx.calibration.create({ data: { equipmentId: Number(req.params.id), lastCalibrationDate: parseDate(calibration.lastCalibrationDate), nextCalibrationDate: parseDate(calibration.nextCalibrationDate) } });
      }
    }
    if (dicom) {
      await tx.dicomConfig.upsert({
        where: { equipmentId: Number(req.params.id) },
        create: {
          equipmentId: Number(req.params.id),
          aeTitle: dicom.aeTitle,
          risAeTitle: dicom.risAeTitle,
          pacsAeTitle: dicom.pacsAeTitle,
          ipAddress: dicom.ipAddress,
          risIpAddress: dicom.risIpAddress,
          pacsIpAddress: dicom.pacsIpAddress,
          port: dicom.port,
          risPort: dicom.risPort,
          pacsPort: dicom.pacsPort,
          anidesk: dicom.anidesk,
          username: dicom.username,
          encryptedPassword: dicom.password,
          observations: dicom.observations,
        },
        update: {
          aeTitle: dicom.aeTitle,
          risAeTitle: dicom.risAeTitle,
          pacsAeTitle: dicom.pacsAeTitle,
          ipAddress: dicom.ipAddress,
          risIpAddress: dicom.risIpAddress,
          pacsIpAddress: dicom.pacsIpAddress,
          port: dicom.port,
          risPort: dicom.risPort,
          pacsPort: dicom.pacsPort,
          anidesk: dicom.anidesk,
          username: dicom.username,
          encryptedPassword: dicom.password || undefined,
          observations: dicom.observations,
        },
      });
    }
    return tx.equipment.findUnique({ where: { id: Number(req.params.id) }, include: { area: true } });
  });
  res.json(serializeBigInt(equipment));
});

export const deleteEquipment = asyncHandler(async (req, res) => {
  const equipmentId = Number(req.params.id);
  if (!Number.isInteger(equipmentId) || equipmentId <= 0) {
    throw new AppError('Identificador de equipo inválido', 400);
  }

  await prisma.$transaction(async (tx) => {
    const equipment = await tx.equipment.findUnique({ where: { id: equipmentId }, select: { id: true } });
    if (!equipment) {
      throw new AppError('Equipo no encontrado', 404);
    }

    const maintenances = await tx.maintenance.findMany({
      where: { equipmentId },
      select: { id: true },
    });
    const maintenanceIds = maintenances.map(({ id }) => id);

    if (maintenanceIds.length) {
      await tx.maintenanceDocument.deleteMany({ where: { maintenanceId: { in: maintenanceIds } } });
    }
    await tx.maintenance.deleteMany({ where: { equipmentId } });
    await tx.incident.deleteMany({ where: { equipmentId } });
    await tx.maintenanceSchedule.deleteMany({ where: { equipmentId } });
    await tx.contract.deleteMany({ where: { equipmentId } });
    await tx.license.deleteMany({ where: { equipmentId } });
    await tx.calibration.deleteMany({ where: { equipmentId } });
    await tx.qualityControl.deleteMany({ where: { equipmentId } });
    await tx.dicomConfig.deleteMany({ where: { equipmentId } });
    await tx.block.deleteMany({ where: { equipmentId } });
    await tx.equipmentDocument.deleteMany({ where: { equipmentId } });
    await tx.equipment.delete({ where: { id: equipmentId } });
  });

  res.status(204).send();
});

export const uploadEquipmentFile = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new AppError('Debe seleccionar una imagen o un PDF', 400);
  }
  const filePath = `/uploads/equipment/${req.file.filename}`;
  const equipmentId = Number(req.params.id);
  const documentType = req.body.documentType || 'OTHER';
  const expirationDate = parseDate(req.body.expirationDate);
  await prisma.$transaction(async (tx) => {
    await tx.equipmentDocument.create({
      data: {
        equipmentId,
        documentType,
        fileName: req.file.originalname,
        filePath,
        mimeType: req.file.mimetype,
        fileSize: req.file.size,
        uploadedById: req.user.id,
        expirationDate,
      },
    });
    if (req.file.mimetype.startsWith('image/')) {
      await tx.equipment.update({
        where: { id: equipmentId },
        data: { photoPath: filePath },
      });
    }
  });
  const equipment = await prisma.equipment.findUnique({
    where: { id: equipmentId },
    include: { documents: { orderBy: { createdAt: 'desc' } } },
  });
  res.json(serializeBigInt(equipment));
});

export const listEquipmentDocuments = asyncHandler(async (req, res) => {
  const documents = await prisma.equipmentDocument.findMany({
    where: { equipmentId: Number(req.params.id) },
    orderBy: { uploadedAt: 'desc' },
  });
  res.json(serializeBigInt(documents));
});

export const downloadEquipmentDocument = asyncHandler(async (req, res) => {
  const document = await prisma.equipmentDocument.findFirst({
    where: { id: Number(req.params.documentId), equipmentId: Number(req.params.id) },
  });
  if (!document) throw new AppError('Documento no encontrado', 404);
  const absolutePath = path.resolve(uploadDir, document.filePath.replace(/^\/uploads\//, ''));
  res.download(absolutePath, document.fileName);
});

export const deleteEquipmentDocument = asyncHandler(async (req, res) => {
  const document = await prisma.equipmentDocument.findFirst({
    where: { id: Number(req.params.documentId), equipmentId: Number(req.params.id) },
  });
  if (!document) throw new AppError('Documento no encontrado', 404);
  await prisma.equipmentDocument.delete({ where: { id: document.id } });
  res.status(204).send();
});
