IF OBJECT_ID(N'dbo.invoice_audits', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.invoice_audits (
    id INT IDENTITY(1,1) NOT NULL CONSTRAINT pk_invoice_audits PRIMARY KEY,
    period NVARCHAR(7) NOT NULL,
    company NVARCHAR(200) NOT NULL,
    equipment_id INT NULL,
    service NVARCHAR(200) NULL,
    invoice_number NVARCHAR(100) NULL,
    invoice_date DATETIME2(3) NULL,
    fixed_monthly_cost FLOAT NOT NULL CONSTRAINT df_invoice_audits_fixed DEFAULT (0),
    additional_total FLOAT NOT NULL CONSTRAINT df_invoice_audits_additional DEFAULT (0),
    expected_value FLOAT NOT NULL CONSTRAINT df_invoice_audits_expected DEFAULT (0),
    invoiced_value FLOAT NOT NULL CONSTRAINT df_invoice_audits_invoiced DEFAULT (0),
    difference FLOAT NOT NULL CONSTRAINT df_invoice_audits_difference DEFAULT (0),
    variation_percent FLOAT NOT NULL CONSTRAINT df_invoice_audits_variation DEFAULT (0),
    status NVARCHAR(40) NOT NULL CONSTRAINT df_invoice_audits_status DEFAULT (N'REVIEWED'),
    comment NVARCHAR(MAX) NULL,
    threshold_percent FLOAT NOT NULL CONSTRAINT df_invoice_audits_threshold DEFAULT (10),
    created_at DATETIME2(3) NOT NULL CONSTRAINT df_invoice_audits_created DEFAULT (SYSUTCDATETIME()),
    updated_at DATETIME2(3) NOT NULL CONSTRAINT df_invoice_audits_updated DEFAULT (SYSUTCDATETIME())
  );
END;
IF OBJECT_ID(N'dbo.invoice_audit_items', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.invoice_audit_items (
    id INT IDENTITY(1,1) NOT NULL CONSTRAINT pk_invoice_audit_items PRIMARY KEY,
    audit_id INT NOT NULL,
    concept NVARCHAR(200) NOT NULL,
    amount FLOAT NOT NULL,
    created_at DATETIME2(3) NOT NULL CONSTRAINT df_invoice_audit_items_created DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT fk_invoice_audit_items_audit FOREIGN KEY (audit_id) REFERENCES dbo.invoice_audits(id) ON DELETE CASCADE
  );
END;
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'ix_invoice_audits_period' AND object_id = OBJECT_ID(N'dbo.invoice_audits'))
  CREATE INDEX ix_invoice_audits_period ON dbo.invoice_audits(period);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'ix_invoice_audits_status' AND object_id = OBJECT_ID(N'dbo.invoice_audits'))
  CREATE INDEX ix_invoice_audits_status ON dbo.invoice_audits(status);
IF COL_LENGTH(N'dbo.invoice_audits', N'recurrence_key') IS NULL
  ALTER TABLE dbo.invoice_audits ADD recurrence_key NVARCHAR(80) NULL;
IF COL_LENGTH(N'dbo.invoice_audits', N'recurrence_months') IS NULL
  ALTER TABLE dbo.invoice_audits ADD recurrence_months INT NULL;
IF COL_LENGTH(N'dbo.invoice_audits', N'recurrence_index') IS NULL
  ALTER TABLE dbo.invoice_audits ADD recurrence_index INT NULL;
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'ix_invoice_audits_recurrence' AND object_id = OBJECT_ID(N'dbo.invoice_audits'))
  CREATE INDEX ix_invoice_audits_recurrence ON dbo.invoice_audits(recurrence_key);
