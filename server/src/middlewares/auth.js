import { verifyToken } from '../utils/jwt.js';
import { prisma } from '../utils/prisma.js';
import { AppError } from '../utils/asyncHandler.js';

export async function authenticate(req, res, next) {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      throw new AppError('No autorizado', 401);
    }

    const token = header.slice(7);
    const decoded = verifyToken(token);

    const user = await prisma.user.findUnique({
      where: { id: Number(decoded.userId) },
      include: {
        role: {
          include: {
            permissions: { include: { permission: true } },
          },
        },
      },
    });

    if (!user || !user.active || !user.role.active || (decoded.sessionVersion ?? 0) !== user.sessionVersion) {
      throw new AppError('Usuario no encontrado o inactivo', 401);
    }

    req.user = user;
    next();
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
}

export function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'No autorizado' });
    }

    if (roles.length && !roles.includes(req.user.role.name)) {
      return res.status(403).json({ error: 'Permisos insuficientes' });
    }

    next();
  };
}

export function requirePermission(...permissions) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'No autorizado' });
    }

    const granted = new Set(
      req.user.role.permissions.map(({ permission }) => permission.key)
    );
    if (!permissions.some((permission) => granted.has(permission))) {
      return res.status(403).json({ error: 'Permisos insuficientes' });
    }

    next();
  };
}

export function errorHandler(err, req, res, next) {
  console.error(err);

  if (err.name === 'ZodError') {
    return res.status(400).json({
      error: 'Datos inválidos',
      details: err.errors,
    });
  }

  if (err.code === 'P2002') {
    return res.status(409).json({ error: 'Registro duplicado' });
  }

  const status = err.statusCode || 500;
  res.status(status).json({
    error: err.message || 'Error interno del servidor',
  });
}
