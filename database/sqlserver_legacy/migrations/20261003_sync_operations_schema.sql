/* Synchronize operational fields required by the Prisma schema. */
IF OBJECT_ID(N'dbo.maintenance', N'U') IS NOT NULL
   AND COL_LENGTH(N'dbo.maintenance', N'responsible') IS NULL
  ALTER TABLE dbo.maintenance ADD responsible NVARCHAR(150) NULL;

IF OBJECT_ID(N'dbo.incidents', N'U') IS NOT NULL
   AND COL_LENGTH(N'dbo.incidents', N'reporter_name') IS NULL
  ALTER TABLE dbo.incidents ADD reporter_name NVARCHAR(150) NULL;
