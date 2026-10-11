IF OBJECT_ID(N'dbo.maintenance', N'U') IS NOT NULL
BEGIN
  IF EXISTS (
    SELECT 1
    FROM sys.columns
    WHERE object_id = OBJECT_ID(N'dbo.maintenance')
      AND name = N'description'
      AND system_type_id IN (167, 231)
      AND max_length <> -1
  )
    ALTER TABLE dbo.maintenance ALTER COLUMN description NVARCHAR(MAX) NULL;

  IF EXISTS (
    SELECT 1
    FROM sys.columns
    WHERE object_id = OBJECT_ID(N'dbo.maintenance')
      AND name = N'work_performed'
      AND system_type_id IN (167, 231)
      AND max_length <> -1
  )
    ALTER TABLE dbo.maintenance ALTER COLUMN work_performed NVARCHAR(MAX) NULL;

  IF EXISTS (
    SELECT 1
    FROM sys.columns
    WHERE object_id = OBJECT_ID(N'dbo.maintenance')
      AND name = N'spare_parts'
      AND system_type_id IN (167, 231)
      AND max_length <> -1
  )
    ALTER TABLE dbo.maintenance ALTER COLUMN spare_parts NVARCHAR(MAX) NULL;

  IF EXISTS (
    SELECT 1
    FROM sys.columns
    WHERE object_id = OBJECT_ID(N'dbo.maintenance')
      AND name = N'observations'
      AND system_type_id IN (167, 231)
      AND max_length <> -1
  )
    ALTER TABLE dbo.maintenance ALTER COLUMN observations NVARCHAR(MAX) NULL;
END;
