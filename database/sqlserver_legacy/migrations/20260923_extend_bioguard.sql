/* Idempotent extension for existing BioGuard SQL Server databases. */
IF COL_LENGTH(N'dbo.equipment', N'modality') IS NULL
  ALTER TABLE dbo.equipment ADD modality NVARCHAR(100) NULL;
IF COL_LENGTH(N'dbo.equipment', N'provider_phone') IS NULL
  ALTER TABLE dbo.equipment ADD provider_phone NVARCHAR(50) NULL;
IF COL_LENGTH(N'dbo.equipment', N'provider_email') IS NULL
  ALTER TABLE dbo.equipment ADD provider_email NVARCHAR(200) NULL;
IF COL_LENGTH(N'dbo.equipment', N'provider_contact_person') IS NULL
  ALTER TABLE dbo.equipment ADD provider_contact_person NVARCHAR(200) NULL;

IF COL_LENGTH(N'dbo.equipment_documents', N'document_type') IS NULL
  ALTER TABLE dbo.equipment_documents ADD document_type NVARCHAR(50) NOT NULL
    CONSTRAINT df_equipment_documents_type DEFAULT (N'OTHER');
IF COL_LENGTH(N'dbo.equipment_documents', N'expiration_date') IS NULL
  ALTER TABLE dbo.equipment_documents ADD expiration_date DATETIME2(3) NULL;
IF COL_LENGTH(N'dbo.equipment_documents', N'uploaded_at') IS NULL
  ALTER TABLE dbo.equipment_documents ADD uploaded_at DATETIME2(3) NOT NULL
    CONSTRAINT df_equipment_documents_uploaded_at DEFAULT (SYSUTCDATETIME());
IF COL_LENGTH(N'dbo.equipment_documents', N'uploaded_by') IS NULL
  ALTER TABLE dbo.equipment_documents ADD uploaded_by INT NULL;

IF NOT EXISTS (
  SELECT 1
  FROM sys.foreign_keys
  WHERE name = N'fk_equipment_documents_uploaded_by'
    AND parent_object_id = OBJECT_ID(N'dbo.equipment_documents')
)
  ALTER TABLE dbo.equipment_documents ADD CONSTRAINT fk_equipment_documents_uploaded_by
    FOREIGN KEY (uploaded_by) REFERENCES dbo.users(id);

IF COL_LENGTH(N'dbo.maintenance_schedule', N'rescheduled_date') IS NULL
  ALTER TABLE dbo.maintenance_schedule ADD rescheduled_date DATETIME2(3) NULL;
IF COL_LENGTH(N'dbo.maintenance_schedule', N'change_justification') IS NULL
  ALTER TABLE dbo.maintenance_schedule ADD change_justification NVARCHAR(MAX) NULL;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'ix_equipment_documents_expiration' AND object_id = OBJECT_ID(N'dbo.equipment_documents'))
  CREATE INDEX ix_equipment_documents_expiration ON dbo.equipment_documents(expiration_date);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'ix_contracts_end_date' AND object_id = OBJECT_ID(N'dbo.contracts'))
  CREATE INDEX ix_contracts_end_date ON dbo.contracts(end_date);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'ix_quality_controls_next_date' AND object_id = OBJECT_ID(N'dbo.quality_controls'))
  CREATE INDEX ix_quality_controls_next_date ON dbo.quality_controls(next_control_date);
