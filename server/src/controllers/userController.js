import bcrypt from 'bcryptjs';
import { prisma, serializeBigInt } from '../utils/prisma.js';
import { asyncHandler, AppError } from '../utils/asyncHandler.js';
import { passwordSchema, registerSchema, roleSchema } from '../validators/schemas.js';
import { writeAuditLog } from '../utils/audit.js';

const roleInclude = {
  permissions: { include: { permission: true } },
};

function publicUser(user) {
  return serializeBigInt({
    id: user.id,
    name: user.name,
    email: user.email,
    active: user.active,
    lastLoginAt: user.lastLoginAt,
    createdAt: user.createdAt,
    role: user.role,
  });
}

async function findRole(roleId) {
  const role = await prisma.role.findUnique({ where: { id: roleId } });
  if (!role || !role.active) throw new AppError('Perfil no válido o inactivo', 400);
  return role;
}

export const listUsers = asyncHandler(async (_req, res) => {
  const users = await prisma.user.findMany({
    orderBy: { name: 'asc' },
    include: { role: { include: roleInclude } },
  });
  res.json(users.map(publicUser));
});

export const createUser = asyncHandler(async (req, res) => {
  const data = registerSchema.parse(req.body);
  await findRole(data.roleId);
  const passwordHash = await bcrypt.hash(data.password, 12);
  const user = await prisma.user.create({
    data: {
      name: data.name,
      email: data.email,
      passwordHash,
      roleId: data.roleId,
      active: data.active ?? true,
    },
    include: { role: { include: roleInclude } },
  });
  await writeAuditLog({ userId: req.user.id, action: 'USER_CREATED', entity: 'USER', entityId: user.id, ipAddress: req.ip });
  res.status(201).json(publicUser(user));
});

export const updateUser = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const data = registerSchema.partial().parse(req.body);
  const current = await prisma.user.findUnique({
    where: { id },
    include: { role: true },
  });
  if (!current) throw new AppError('Usuario no encontrado', 404);
  if (current.role.name === 'ADMIN' && data.active === false) {
    throw new AppError('Los usuarios ADMIN no pueden inhabilitarse', 400);
  }
  if (data.roleId !== undefined) await findRole(data.roleId);
  if (current.role.name === 'ADMIN' && data.roleId !== undefined) {
    const targetRole = await prisma.role.findUnique({ where: { id: data.roleId } });
    if (targetRole?.name !== 'ADMIN') {
      const activeAdmins = await prisma.user.count({
        where: { active: true, role: { name: 'ADMIN' } },
      });
      if (activeAdmins <= 1) {
        throw new AppError('Debe existir al menos un administrador activo', 400);
      }
    }
  }
  const update = {
    ...(data.name !== undefined ? { name: data.name } : {}),
    ...(data.email !== undefined ? { email: data.email } : {}),
    ...(data.roleId !== undefined ? { roleId: data.roleId } : {}),
    ...(data.active !== undefined ? { active: data.active } : {}),
  };
  if (data.password) {
    update.passwordHash = await bcrypt.hash(data.password, 12);
    update.sessionVersion = { increment: 1 };
  }
  const user = await prisma.user.update({
    where: { id },
    data: update,
    include: { role: { include: roleInclude } },
  });
  await writeAuditLog({ userId: req.user.id, action: 'USER_UPDATED', entity: 'USER', entityId: user.id, ipAddress: req.ip });
  res.json(publicUser(user));
});

export const changeUserPassword = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const { password } = passwordSchema.parse(req.body);
  await prisma.user.update({
    where: { id },
    data: {
      passwordHash: await bcrypt.hash(password, 12),
      sessionVersion: { increment: 1 },
    },
  });
  await writeAuditLog({ userId: req.user.id, action: 'USER_PASSWORD_RESET', entity: 'USER', entityId: id, ipAddress: req.ip });
  res.status(204).send();
});

export const deleteUser = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  if (id === req.user.id) throw new AppError('No puedes eliminar tu propio usuario', 400);
  const user = await prisma.user.findUnique({
    where: { id },
    include: { role: true },
  });
  if (!user) throw new AppError('Usuario no encontrado', 404);
  if (user.role.name === 'ADMIN') {
    throw new AppError('Los usuarios ADMIN no pueden inhabilitarse', 400);
  }
  await prisma.user.update({
    where: { id },
    data: { active: false, sessionVersion: { increment: 1 } },
  });
  await writeAuditLog({ userId: req.user.id, action: 'USER_DISABLED', entity: 'USER', entityId: id, ipAddress: req.ip });
  res.status(204).send();
});

export const listPermissions = asyncHandler(async (_req, res) => {
  const permissions = await prisma.permission.findMany({
    orderBy: [{ module: 'asc' }, { action: 'asc' }],
  });
  res.json(permissions);
});

export const listRoles = asyncHandler(async (_req, res) => {
  const roles = await prisma.role.findMany({
    orderBy: { name: 'asc' },
    include: {
      permissions: { include: { permission: true } },
      _count: { select: { users: true } },
    },
  });
  res.json(serializeBigInt(roles));
});

export const createRole = asyncHandler(async (req, res) => {
  const data = roleSchema.parse(req.body);
  const permissions = await prisma.permission.findMany({
    where: { key: { in: data.permissionKeys } },
  });
  if (permissions.length !== data.permissionKeys.length) {
    throw new AppError('Uno o más permisos no existen', 400);
  }
  const role = await prisma.role.create({
    data: {
      name: data.name,
      description: data.description,
      active: data.active ?? true,
      permissions: {
        create: permissions.map((permission) => ({ permissionId: permission.id })),
      },
    },
    include: { permissions: { include: { permission: true } } },
  });
  await writeAuditLog({ userId: req.user.id, action: 'ROLE_CREATED', entity: 'ROLE', entityId: role.id, ipAddress: req.ip });
  res.status(201).json(serializeBigInt(role));
});

export const updateRole = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const data = roleSchema.parse(req.body);
  const current = await prisma.role.findUnique({ where: { id } });
  if (!current) throw new AppError('Perfil no encontrado', 404);
  const isAdmin = current.name === 'ADMIN';
  const permissions = await prisma.permission.findMany({
    where: { key: { in: data.permissionKeys } },
  });
  const effectivePermissions = isAdmin
    ? await prisma.permission.findMany()
    : permissions;
  if (!isAdmin && permissions.length !== data.permissionKeys.length) {
    throw new AppError('Uno o más permisos no existen', 400);
  }
  const role = await prisma.$transaction(async (tx) => {
    await tx.rolePermission.deleteMany({ where: { roleId: id } });
    return tx.role.update({
      where: { id },
      data: {
        name: isAdmin ? 'ADMIN' : data.name,
        description: isAdmin ? current.description : data.description,
        active: isAdmin ? true : data.active ?? true,
        permissions: {
          create: effectivePermissions.map((permission) => ({ permissionId: permission.id })),
        },
      },
      include: { permissions: { include: { permission: true } } },
    });
  });
  await writeAuditLog({ userId: req.user.id, action: 'ROLE_UPDATED', entity: 'ROLE', entityId: role.id, ipAddress: req.ip });
  res.json(serializeBigInt(role));
});

export const deleteRole = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const role = await prisma.role.findUnique({
    where: { id },
    include: { _count: { select: { users: true } } },
  });
  if (!role) throw new AppError('Perfil no encontrado', 404);
  if (role.name === 'ADMIN') {
    throw new AppError('El perfil ADMIN no se puede eliminar', 400);
  }
  if (role._count.users) throw new AppError('No se puede eliminar un perfil con usuarios asociados', 400);
  await prisma.role.delete({ where: { id } });
  await writeAuditLog({ userId: req.user.id, action: 'ROLE_DELETED', entity: 'ROLE', entityId: id, ipAddress: req.ip });
  res.status(204).send();
});
