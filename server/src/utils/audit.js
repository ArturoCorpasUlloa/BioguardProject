import { prisma } from './prisma.js';

export async function writeAuditLog({ userId = null, action, entity, entityId = null, oldData, newData, ipAddress }) {
  await prisma.auditLog.create({
    data: {
      userId,
      action,
      entity,
      entityId,
      oldData: oldData === undefined ? undefined : JSON.stringify(oldData),
      newData: newData === undefined ? undefined : JSON.stringify(newData),
      ipAddress: ipAddress || null,
    },
  });
}
