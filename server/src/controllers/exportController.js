import { prisma } from '../utils/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const TABLES = [
  'roles', 'permissions', 'role_permissions', 'users', 'areas', 'equipment',
  'equipment_documents', 'contracts', 'licenses', 'calibrations',
  'quality_controls', 'maintenance', 'maintenance_documents', 'incidents',
  'maintenance_schedule', 'dicom_configs', 'blocks', 'notifications',
  'audit_logs', 'invoice_audits',
];

function quoteIdentifier(value) {
  return `"${value.replaceAll('"', '""')}"`;
}

function quoteValue(value) {
  if (value === null || value === undefined) return 'NULL';
  if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
  if (typeof value === 'number' || typeof value === 'bigint') return String(value);
  if (value instanceof Date) return `'${value.toISOString()}'`;
  return `'${String(value).replaceAll("'", "''")}'`;
}

export const exportSql = asyncHandler(async (_req, res) => {
  const lines = [
    '-- BioGuard - Exportación PostgreSQL',
    `-- Fecha: ${new Date().toISOString()}`,
    '-- Ejecutar sobre una base PostgreSQL BioGuard existente.',
    '',
  ];

  for (const table of TABLES) {
    const columns = await prisma.$queryRawUnsafe(`
      SELECT column_name AS name
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = '${table}'
      ORDER BY ordinal_position;
    `);
    const columnNames = columns.map((column) => column.name);
    if (!columnNames.length) continue;

    const rows = await prisma.$queryRawUnsafe(`SELECT * FROM ${quoteIdentifier(table)};`);
    lines.push(`-- ${table}: ${rows.length} registros`);
    if (rows.length) {
      const columnSql = columnNames.map(quoteIdentifier).join(', ');
      for (const row of rows) {
        const values = columnNames.map((column) => quoteValue(row[column])).join(', ');
        lines.push(`INSERT INTO ${quoteIdentifier(table)} (${columnSql}) VALUES (${values});`);
      }
    }
    lines.push('');
  }

  res
    .status(200)
    .type('application/sql')
    .set('Content-Disposition', `attachment; filename="bioguard-export-${new Date().toISOString().slice(0, 10)}.sql"`)
    .send(lines.join('\n'));
});
