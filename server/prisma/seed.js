import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const roles = [
  { name: 'ADMIN', description: 'Administrador con acceso completo', isSystem: true },
  { name: 'TECHNICIAN', description: 'Técnico biomédico', isSystem: true },
  { name: 'SUPERVISOR', description: 'Supervisor', isSystem: true },
  { name: 'VIEWER', description: 'Consulta solo lectura', isSystem: true },
];

const modules = [
  ['dashboard', ['view']],
  ['equipment', ['view', 'create', 'update', 'delete']],
  ['areas', ['view', 'create', 'update', 'delete']],
  ['maintenance', ['view', 'create', 'update', 'delete']],
  ['incidents', ['view', 'create', 'update', 'delete']],
  ['licenses', ['view', 'create', 'update', 'delete']],
  ['contracts', ['view', 'create', 'update', 'delete']],
  ['quality_controls', ['view', 'create', 'update', 'delete']],
  ['dicom', ['view', 'create', 'update', 'delete']],
  ['schedule', ['view', 'create', 'update', 'delete']],
  ['invoice_audits', ['view', 'create', 'update', 'delete']],
  ['reports', ['view']],
  ['users', ['view', 'create', 'update', 'delete']],
  ['roles', ['view', 'create', 'update', 'delete']],
  ['database_export', ['execute']],
];

const permissionDescriptions = {
  view: 'Consultar',
  create: 'Crear',
  update: 'Editar',
  delete: 'Eliminar',
  execute: 'Ejecutar',
};

const areas = [
  { name: 'Radiología', code: 'RAD', location: 'Piso 1' },
  { name: 'Tomografía', code: 'TOM', location: 'Piso 1' },
  { name: 'Resonancia', code: 'RMN', location: 'Piso 2' },
  { name: 'Urgencias', code: 'URG', location: 'Piso 0' },
  { name: 'UCI', code: 'UCI', location: 'Piso 3' },
  { name: 'Hospitalización', code: 'HOS', location: 'Piso 4' },
  { name: 'Quirófano', code: 'QUI', location: 'Piso 2' },
];

async function main() {
  for (const role of roles) {
    await prisma.role.upsert({
      where: { name: role.name },
      update: { description: role.description, isSystem: role.isSystem },
      create: { ...role, active: true },
    });
  }

  for (const [module, actions] of modules) {
    for (const action of actions) {
      await prisma.permission.upsert({
        where: { key: `${module}.${action}` },
        update: {},
        create: {
          key: `${module}.${action}`,
          module,
          action,
          description: `${permissionDescriptions[action]} ${module}`,
        },
      });
    }
  }

  const allPermissions = await prisma.permission.findMany();
  const adminRole = await prisma.role.findUnique({ where: { name: 'ADMIN' } });
  await prisma.rolePermission.deleteMany({ where: { roleId: adminRole.id } });
  await prisma.rolePermission.createMany({
    data: allPermissions.map((permission) => ({
      roleId: adminRole.id,
      permissionId: permission.id,
    })),
  });

  const rolePermissions = {
    TECHNICIAN: [
      'dashboard.view', 'equipment.view', 'equipment.create', 'equipment.update',
      'maintenance.view', 'maintenance.create', 'maintenance.update', 'maintenance.delete',
      'incidents.view', 'incidents.create', 'incidents.update', 'incidents.delete',
      'licenses.view', 'licenses.create', 'licenses.update', 'contracts.view',
      'contracts.create', 'contracts.update', 'quality_controls.view',
      'quality_controls.create', 'quality_controls.update', 'dicom.view', 'dicom.update',
      'schedule.view', 'schedule.create', 'schedule.update', 'invoice_audits.view',
      'invoice_audits.create', 'invoice_audits.update',
    ],
    SUPERVISOR: [
      'dashboard.view', 'equipment.view', 'equipment.create', 'equipment.update',
      'maintenance.view', 'maintenance.create', 'maintenance.update', 'incidents.view',
      'incidents.create', 'incidents.update', 'licenses.view', 'licenses.create',
      'licenses.update', 'contracts.view', 'contracts.create', 'contracts.update',
      'quality_controls.view', 'quality_controls.create', 'quality_controls.update',
      'dicom.view', 'dicom.update', 'schedule.view', 'schedule.create', 'schedule.update',
      'invoice_audits.view', 'invoice_audits.create', 'invoice_audits.update', 'reports.view',
    ],
    VIEWER: [
      'dashboard.view', 'equipment.view', 'areas.view', 'maintenance.view',
      'incidents.view', 'licenses.view', 'contracts.view', 'quality_controls.view',
      'dicom.view', 'schedule.view', 'invoice_audits.view', 'reports.view',
    ],
  };

  for (const [roleName, keys] of Object.entries(rolePermissions)) {
    const role = await prisma.role.findUnique({ where: { name: roleName } });
    const selected = allPermissions.filter(({ key }) => keys.includes(key));
    await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });
    await prisma.rolePermission.createMany({
      data: selected.map((permission) => ({
        roleId: role.id,
        permissionId: permission.id,
      })),
    });
  }

  const passwordHash = await bcrypt.hash('admin123', 12);
  await prisma.user.upsert({
    where: { email: 'admin@bioguard.local' },
    update: {},
    create: {
      name: 'Administrador',
      email: 'admin@bioguard.local',
      passwordHash,
      roleId: adminRole.id,
    },
  });

  for (const area of areas) {
    const existing = await prisma.area.findFirst({ where: { code: area.code } });
    if (!existing) {
      await prisma.area.create({ data: area });
    } else if (existing.name !== area.name || existing.location !== area.location) {
      await prisma.area.update({
        where: { id: existing.id },
        data: { name: area.name, location: area.location },
      });
    }
  }

  console.log('Seed completado.');
  console.log('Usuario: admin@bioguard.local / admin123');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
