import { prisma } from '../utils/prisma.js';
import { asyncHandler, AppError } from '../utils/asyncHandler.js';

const TABLES = [
  'roles',
  'users',
  'areas',
  'equipment',
  'equipment_documents',
  'contracts',
  'licenses',
  'calibrations',
  'quality_controls',
  'maintenance',
  'maintenance_documents',
  'incidents',
  'maintenance_schedule',
  'dicom_configs',
  'blocks',
  'notifications',
  'audit_logs',
];

function quoteIdentifier(value) {
  return `[${value.replaceAll(']', ']]')}]`;
}

function quoteValue(value) {
  if (value === null || value === undefined) return 'NULL';
  if (typeof value === 'boolean') return value ? '1' : '0';
  if (typeof value === 'number' || typeof value === 'bigint') return String(value);
  if (value instanceof Date) return `'${value.toISOString().replace('T', ' ').replace('Z', '')}'`;
  return `N'${String(value).replaceAll("'", "''")}'`;
}

export const exportSql = asyncHandler(async (_req, res) => {
  const lines = [
    '-- BioGuard - Exportación de información',
    `-- Fecha: ${new Date().toISOString()}`,
    '-- Ejecutar sobre una base BioGuard existente.',
    'SET XACT_ABORT ON;',
    'BEGIN TRANSACTION;',
    '',
  ];

  for (const table of TABLES) {
    const columns = await prisma.$queryRawUnsafe(`
      SELECT COLUMN_NAME AS name
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = 'dbo' AND TABLE_NAME = '${table}'
      ORDER BY ORDINAL_POSITION;
    `);
    const columnNames = columns.map((column) => column.name);
    if (!columnNames.length) continue;
    const identityColumn = await prisma.$queryRawUnsafe(`
      SELECT TOP 1 COLUMN_NAME AS name
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = 'dbo'
        AND TABLE_NAME = '${table}'
        AND COLUMNPROPERTY(OBJECT_ID(TABLE_SCHEMA + '.' + TABLE_NAME), COLUMN_NAME, 'IsIdentity') = 1;
    `);

    const rows = await prisma.$queryRawUnsafe(`SELECT * FROM ${quoteIdentifier(table)};`);
    lines.push(`-- ${table}: ${rows.length} registros`);
    if (rows.length) {
      const columnSql = columnNames.map(quoteIdentifier).join(', ');
      if (identityColumn.length) {
        lines.push(`SET IDENTITY_INSERT ${quoteIdentifier(table)} ON;`);
      }
      for (const row of rows) {
        const values = columnNames.map((column) => quoteValue(row[column])).join(', ');
        lines.push(`INSERT INTO ${quoteIdentifier(table)} (${columnSql}) VALUES (${values});`);
      }
      if (identityColumn.length) {
        lines.push(`SET IDENTITY_INSERT ${quoteIdentifier(table)} OFF;`);
      }
    }
    lines.push('');
  }

  lines.push('COMMIT TRANSACTION;');
  res
    .status(200)
    .type('application/sql')
    .set('Content-Disposition', `attachment; filename="bioguard-export-${new Date().toISOString().slice(0, 10)}.sql"`)
    .send(lines.join('\n'));
});
