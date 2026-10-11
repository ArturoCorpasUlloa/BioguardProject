import { prisma, serializeBigInt } from '../utils/prisma.js';
import { asyncHandler, AppError } from '../utils/asyncHandler.js';
import { areaSchema } from '../validators/schemas.js';

export const listAreas = asyncHandler(async (_req, res) => {
  const areas = await prisma.area.findMany({
    orderBy: { name: 'asc' },
    include: { _count: { select: { equipment: true } } },
  });
  res.json(serializeBigInt(areas));
});

export const createArea = asyncHandler(async (req, res) => {
  const data = areaSchema.parse(req.body);
  const area = await prisma.area.create({ data });
  res.status(201).json(serializeBigInt(area));
});

export const updateArea = asyncHandler(async (req, res) => {
  const data = areaSchema.partial().parse(req.body);
  const area = await prisma.area.update({
    where: { id: Number(req.params.id) },
    data,
  });
  res.json(serializeBigInt(area));
});

export const deleteArea = asyncHandler(async (req, res) => {
  const count = await prisma.equipment.count({
    where: { areaId: Number(req.params.id) },
  });

  if (count > 0) {
    throw new AppError('No se puede eliminar un área con equipos asociados', 400);
  }

  await prisma.area.delete({ where: { id: Number(req.params.id) } });
  res.status(204).send();
});
