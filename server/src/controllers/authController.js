import bcrypt from 'bcryptjs';
import { prisma, serializeBigInt } from '../utils/prisma.js';
import { signToken } from '../utils/jwt.js';
import { asyncHandler, AppError } from '../utils/asyncHandler.js';
import { loginSchema, registerSchema, selfPasswordSchema } from '../validators/schemas.js';
import { writeAuditLog } from '../utils/audit.js';

export const login = asyncHandler(async (req, res) => {
  const { email, password } = loginSchema.parse(req.body);

  const user = await prisma.user.findUnique({
    where: { email },
    include: { role: { include: { permissions: { include: { permission: true } } } } },
  });

  if (!user || !user.active) {
    await writeAuditLog({ action: 'LOGIN_FAILED', entity: 'AUTH', ipAddress: req.ip });
    throw new AppError('Credenciales inválidas', 401);
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    await writeAuditLog({ userId: user.id, action: 'LOGIN_FAILED', entity: 'USER', entityId: user.id, ipAddress: req.ip });
    throw new AppError('Credenciales inválidas', 401);
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });
  await writeAuditLog({ userId: user.id, action: 'LOGIN_SUCCESS', entity: 'USER', entityId: user.id, ipAddress: req.ip });

  const token = signToken({
    userId: user.id.toString(),
    sessionVersion: user.sessionVersion,
  });

  res.json({
    token,
    user: serializeBigInt({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    }),
  });

});

export const changeOwnPassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = selfPasswordSchema.parse(req.body);
  const valid = await bcrypt.compare(currentPassword, req.user.passwordHash);
  if (!valid) throw new AppError('La contraseña actual no es válida', 400);

  await prisma.user.update({
    where: { id: req.user.id },
    data: {
      passwordHash: await bcrypt.hash(newPassword, 12),
      sessionVersion: { increment: 1 },
    },
  });
  await writeAuditLog({
    userId: req.user.id,
    action: 'PASSWORD_CHANGED',
    entity: 'USER',
    entityId: req.user.id,
    ipAddress: req.ip,
  });
  res.status(204).send();
});

export const register = asyncHandler(async (req, res) => {
  const data = registerSchema.parse(req.body);

  const role = data.roleId
    ? await prisma.role.findUnique({ where: { id: data.roleId } })
    : await prisma.role.findUnique({ where: { name: 'TECHNICIAN' } });

  if (!role) {
    throw new AppError('Rol no válido', 400);
  }

  const passwordHash = await bcrypt.hash(data.password, 12);

  const user = await prisma.user.create({
    data: {
      name: data.name,
      email: data.email,
      passwordHash,
      roleId: role.id,
    },
    include: { role: { include: { permissions: { include: { permission: true } } } } },
  });

  const token = signToken({
    userId: user.id.toString(),
    sessionVersion: user.sessionVersion,
  });

  res.status(201).json({
    token,
    user: serializeBigInt({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    }),
  });
});

export const me = asyncHandler(async (req, res) => {
  res.json(
    serializeBigInt({
      id: req.user.id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role,
    })
  );
});

export const listRoles = asyncHandler(async (_req, res) => {
  const roles = await prisma.role.findMany({ orderBy: { id: 'asc' } });
  res.json(serializeBigInt(roles));
});
