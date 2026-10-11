/*
  BioGuard - SQL Server / SQL Express
  Ejecutar en SSMS conectado a localhost,1434 (instancia MSSQLSERVER).
  El script es seguro para ejecutar una vez sobre una base nueva.
*/

USE master;
GO

IF DB_ID(N'bioguard') IS NULL
BEGIN
    CREATE DATABASE bioguard;
END;
GO

USE bioguard;
GO

IF OBJECT_ID(N'dbo.roles', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.roles
    (
        id          INT IDENTITY(1,1) NOT NULL CONSTRAINT pk_roles PRIMARY KEY,
        name        NVARCHAR(50) NOT NULL CONSTRAINT uq_roles_name UNIQUE,
        description NVARCHAR(500) NULL
    );
END;
GO

IF OBJECT_ID(N'dbo.users', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.users
    (
        id            INT IDENTITY(1,1) NOT NULL CONSTRAINT pk_users PRIMARY KEY,
        role_id       INT NOT NULL,
        name          NVARCHAR(150) NOT NULL,
        email         NVARCHAR(150) NOT NULL CONSTRAINT uq_users_email UNIQUE,
        password_hash NVARCHAR(255) NOT NULL,
        active        BIT NOT NULL CONSTRAINT df_users_active DEFAULT (1),
        created_at    DATETIME2(3) NOT NULL CONSTRAINT df_users_created DEFAULT (SYSUTCDATETIME()),
        updated_at    DATETIME2(3) NOT NULL CONSTRAINT df_users_updated DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT fk_users_role FOREIGN KEY (role_id) REFERENCES dbo.roles(id)
    );
END;
GO

IF OBJECT_ID(N'dbo.areas', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.areas
    (
        id          INT IDENTITY(1,1) NOT NULL CONSTRAINT pk_areas PRIMARY KEY,
        name        NVARCHAR(150) NOT NULL,
        code        NVARCHAR(50) NULL,
        location    NVARCHAR(200) NULL,
        responsible NVARCHAR(150) NULL,
        active      BIT NOT NULL CONSTRAINT df_areas_active DEFAULT (1),
        created_at  DATETIME2(3) NOT NULL CONSTRAINT df_areas_created DEFAULT (SYSUTCDATETIME())
    );
END;
GO

IF OBJECT_ID(N'dbo.equipment', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.equipment
    (
        id                  INT IDENTITY(1,1) NOT NULL CONSTRAINT pk_equipment PRIMARY KEY,
        name                NVARCHAR(200) NOT NULL,
        brand               NVARCHAR(150) NOT NULL,
        model               NVARCHAR(150) NULL,
        serial_number       NVARCHAR(150) NOT NULL CONSTRAINT uq_equipment_serial UNIQUE,
        inventory_code      NVARCHAR(150) NULL CONSTRAINT uq_equipment_inventory UNIQUE,
        area_id             INT NULL,
        location            NVARCHAR(200) NULL,
        status              NVARCHAR(50) NOT NULL CONSTRAINT df_equipment_status DEFAULT (N'ACTIVE'),
        risk_classification NVARCHAR(50) NULL,
        manufacturer        NVARCHAR(200) NULL,
        importer            NVARCHAR(200) NULL,
        manufacturing_year  INT NULL,
        acquisition_date    DATETIME2(3) NULL,
        installation_date   DATETIME2(3) NULL,
        useful_life_years   INT NULL,
        equipment_type      NVARCHAR(150) NULL,
        technology          NVARCHAR(150) NULL,
        power_supply        NVARCHAR(150) NULL,
        voltage             NVARCHAR(100) NULL,
        power               NVARCHAR(100) NULL,
        invima_registration NVARCHAR(150) NULL,
        invima_expiration   DATETIME2(3) NULL,
        photo_path          NVARCHAR(1000) NULL,
        observations        NVARCHAR(MAX) NULL,
        created_at          DATETIME2(3) NOT NULL CONSTRAINT df_equipment_created DEFAULT (SYSUTCDATETIME()),
        updated_at          DATETIME2(3) NOT NULL CONSTRAINT df_equipment_updated DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT fk_equipment_area FOREIGN KEY (area_id) REFERENCES dbo.areas(id),
        CONSTRAINT ck_equipment_year CHECK (manufacturing_year IS NULL OR manufacturing_year BETWEEN 1900 AND 2200),
        CONSTRAINT ck_equipment_useful_life CHECK (useful_life_years IS NULL OR useful_life_years >= 0)
    );
END;
GO

IF OBJECT_ID(N'dbo.equipment_documents', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.equipment_documents
    (
        id           INT IDENTITY(1,1) NOT NULL CONSTRAINT pk_equipment_documents PRIMARY KEY,
        equipment_id INT NOT NULL,
        file_name    NVARCHAR(255) NOT NULL,
        file_path    NVARCHAR(1000) NOT NULL,
        mime_type    NVARCHAR(100) NULL,
        file_size    BIGINT NULL,
        uploaded_by  INT NULL,
        created_at   DATETIME2(3) NOT NULL CONSTRAINT df_equipment_docs_created DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT fk_equipment_docs_equipment FOREIGN KEY (equipment_id) REFERENCES dbo.equipment(id) ON DELETE CASCADE,
        CONSTRAINT fk_equipment_docs_user FOREIGN KEY (uploaded_by) REFERENCES dbo.users(id)
    );
END;
GO

IF OBJECT_ID(N'dbo.contracts', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.contracts
    (
        id              INT IDENTITY(1,1) NOT NULL CONSTRAINT pk_contracts PRIMARY KEY,
        equipment_id    INT NOT NULL,
        contract_number NVARCHAR(100) NULL,
        company         NVARCHAR(200) NOT NULL,
        contract_type   NVARCHAR(100) NULL,
        start_date      DATETIME2(3) NULL,
        end_date        DATETIME2(3) NULL,
        cost            DECIMAL(18,2) NULL,
        coverage        NVARCHAR(MAX) NULL,
        observations    NVARCHAR(MAX) NULL,
        document_path   NVARCHAR(1000) NULL,
        created_at      DATETIME2(3) NOT NULL CONSTRAINT df_contracts_created DEFAULT (SYSUTCDATETIME()),
        updated_at      DATETIME2(3) NOT NULL CONSTRAINT df_contracts_updated DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT fk_contracts_equipment FOREIGN KEY (equipment_id) REFERENCES dbo.equipment(id) ON DELETE CASCADE,
        CONSTRAINT ck_contracts_dates CHECK (end_date IS NULL OR start_date IS NULL OR end_date >= start_date)
    );
END;
GO

IF COL_LENGTH(N'dbo.contracts', N'cost') IS NULL
BEGIN
    ALTER TABLE dbo.contracts ADD cost DECIMAL(18,2) NULL;
END;
GO

IF OBJECT_ID(N'dbo.licenses', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.licenses
    (
        id                  INT IDENTITY(1,1) NOT NULL CONSTRAINT pk_licenses PRIMARY KEY,
        equipment_id        INT NOT NULL,
        license_type        NVARCHAR(150) NULL,
        registration_number NVARCHAR(150) NULL,
        issue_date          DATETIME2(3) NULL,
        expiration_date     DATETIME2(3) NULL,
        document_path       NVARCHAR(1000) NULL,
        observations        NVARCHAR(MAX) NULL,
        created_at          DATETIME2(3) NOT NULL CONSTRAINT df_licenses_created DEFAULT (SYSUTCDATETIME()),
        updated_at          DATETIME2(3) NOT NULL CONSTRAINT df_licenses_updated DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT fk_licenses_equipment FOREIGN KEY (equipment_id) REFERENCES dbo.equipment(id) ON DELETE CASCADE
    );
END;
GO

IF OBJECT_ID(N'dbo.calibrations', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.calibrations
    (
        id                    INT IDENTITY(1,1) NOT NULL CONSTRAINT pk_calibrations PRIMARY KEY,
        equipment_id          INT NOT NULL,
        last_calibration_date DATETIME2(3) NULL,
        next_calibration_date DATETIME2(3) NULL,
        result                NVARCHAR(100) NULL,
        company               NVARCHAR(200) NULL,
        responsible           NVARCHAR(150) NULL,
        certificate_number    NVARCHAR(150) NULL,
        document_path         NVARCHAR(1000) NULL,
        observations          NVARCHAR(MAX) NULL,
        created_at            DATETIME2(3) NOT NULL CONSTRAINT df_calibrations_created DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT fk_calibrations_equipment FOREIGN KEY (equipment_id) REFERENCES dbo.equipment(id) ON DELETE CASCADE
    );
END;
GO

IF OBJECT_ID(N'dbo.quality_controls', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.quality_controls
    (
        id               INT IDENTITY(1,1) NOT NULL CONSTRAINT pk_quality_controls PRIMARY KEY,
        equipment_id     INT NOT NULL,
        control_date     DATETIME2(3) NOT NULL,
        next_control_date DATETIME2(3) NULL,
        result           NVARCHAR(100) NULL,
        responsible      NVARCHAR(150) NULL,
        cost             DECIMAL(18,2) NULL,
        observations     NVARCHAR(MAX) NULL,
        document_path    NVARCHAR(1000) NULL,
        created_at       DATETIME2(3) NOT NULL CONSTRAINT df_quality_created DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT fk_quality_equipment FOREIGN KEY (equipment_id) REFERENCES dbo.equipment(id) ON DELETE CASCADE
    );
END;
GO

IF COL_LENGTH(N'dbo.quality_controls', N'cost') IS NULL
BEGIN
    ALTER TABLE dbo.quality_controls ADD cost DECIMAL(18,2) NULL;
END;
GO

IF OBJECT_ID(N'dbo.maintenance', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.maintenance
    (
        id                   INT IDENTITY(1,1) NOT NULL CONSTRAINT pk_maintenance PRIMARY KEY,
        equipment_id         INT NOT NULL,
        type                 NVARCHAR(30) NOT NULL,
        status               NVARCHAR(30) NOT NULL CONSTRAINT df_maintenance_status DEFAULT (N'SCHEDULED'),
        scheduled_date       DATETIME2(3) NULL,
        execution_date       DATETIME2(3) NULL,
        technician_id        INT NULL,
        responsible           NVARCHAR(150) NULL,
        company              NVARCHAR(200) NULL,
        description          NVARCHAR(MAX) NULL,
        work_performed       NVARCHAR(MAX) NULL,
        spare_parts          NVARCHAR(MAX) NULL,
        cost                 DECIMAL(15,2) NULL,
        next_maintenance_date DATETIME2(3) NULL,
        observations         NVARCHAR(MAX) NULL,
        created_at           DATETIME2(3) NOT NULL CONSTRAINT df_maintenance_created DEFAULT (SYSUTCDATETIME()),
        updated_at           DATETIME2(3) NOT NULL CONSTRAINT df_maintenance_updated DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT fk_maintenance_equipment FOREIGN KEY (equipment_id) REFERENCES dbo.equipment(id) ON DELETE CASCADE,
        CONSTRAINT fk_maintenance_technician FOREIGN KEY (technician_id) REFERENCES dbo.users(id),
        CONSTRAINT ck_maintenance_type CHECK (type IN (N'PREVENTIVE', N'CORRECTIVE', N'CALIBRATION', N'INSPECTION')),
        CONSTRAINT ck_maintenance_status CHECK (status IN (N'SCHEDULED', N'IN_PROGRESS', N'COMPLETED', N'CANCELLED', N'OVERDUE')),
        CONSTRAINT ck_maintenance_cost CHECK (cost IS NULL OR cost >= 0)
    );
END;
GO

IF OBJECT_ID(N'dbo.maintenance_documents', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.maintenance_documents
    (
        id             INT IDENTITY(1,1) NOT NULL CONSTRAINT pk_maintenance_documents PRIMARY KEY,
        maintenance_id INT NOT NULL,
        file_name      NVARCHAR(255) NOT NULL,
        file_path      NVARCHAR(1000) NOT NULL,
        mime_type      NVARCHAR(100) NULL,
        file_size      BIGINT NULL,
        uploaded_by    INT NULL,
        created_at     DATETIME2(3) NOT NULL CONSTRAINT df_maintenance_docs_created DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT fk_maintenance_docs_maintenance FOREIGN KEY (maintenance_id) REFERENCES dbo.maintenance(id) ON DELETE CASCADE,
        CONSTRAINT fk_maintenance_docs_user FOREIGN KEY (uploaded_by) REFERENCES dbo.users(id)
    );
END;
GO

IF OBJECT_ID(N'dbo.incidents', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.incidents
    (
        id            INT IDENTITY(1,1) NOT NULL CONSTRAINT pk_incidents PRIMARY KEY,
        equipment_id  INT NOT NULL,
        reported_by   INT NULL,
        reporter_name NVARCHAR(150) NULL,
        report_number NVARCHAR(100) NULL,
        assigned_to   INT NULL,
        reported_at   DATETIME2(3) NOT NULL CONSTRAINT df_incidents_reported DEFAULT (SYSUTCDATETIME()),
        priority      NVARCHAR(30) NOT NULL CONSTRAINT df_incidents_priority DEFAULT (N'MEDIUM'),
        status        NVARCHAR(30) NOT NULL CONSTRAINT df_incidents_status DEFAULT (N'REPORTED'),
        description   NVARCHAR(MAX) NULL,
        solution      NVARCHAR(MAX) NULL,
        resolved_at   DATETIME2(3) NULL,
        observations  NVARCHAR(MAX) NULL,
        created_at    DATETIME2(3) NOT NULL CONSTRAINT df_incidents_created DEFAULT (SYSUTCDATETIME()),
        updated_at    DATETIME2(3) NOT NULL CONSTRAINT df_incidents_updated DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT fk_incidents_equipment FOREIGN KEY (equipment_id) REFERENCES dbo.equipment(id) ON DELETE CASCADE,
        CONSTRAINT fk_incidents_reported_by FOREIGN KEY (reported_by) REFERENCES dbo.users(id),
        CONSTRAINT fk_incidents_assigned_to FOREIGN KEY (assigned_to) REFERENCES dbo.users(id),
        CONSTRAINT ck_incidents_priority CHECK (priority IN (N'LOW', N'MEDIUM', N'HIGH', N'CRITICAL')),
        CONSTRAINT ck_incidents_status CHECK (status IN (N'REPORTED', N'ASSIGNED', N'IN_PROGRESS', N'RESOLVED', N'CLOSED'))
    );
END;
GO

IF OBJECT_ID(N'dbo.maintenance_schedule', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.maintenance_schedule
    (
        id               INT IDENTITY(1,1) NOT NULL CONSTRAINT pk_maintenance_schedule PRIMARY KEY,
        equipment_id     INT NOT NULL,
        maintenance_type NVARCHAR(30) NOT NULL,
        scheduled_date   DATETIME2(3) NOT NULL,
        status           NVARCHAR(30) NOT NULL CONSTRAINT df_schedule_status DEFAULT (N'SCHEDULED'),
        responsible_id   INT NULL,
        notes            NVARCHAR(MAX) NULL,
        created_at       DATETIME2(3) NOT NULL CONSTRAINT df_schedule_created DEFAULT (SYSUTCDATETIME()),
        updated_at       DATETIME2(3) NOT NULL CONSTRAINT df_schedule_updated DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT fk_schedule_equipment FOREIGN KEY (equipment_id) REFERENCES dbo.equipment(id) ON DELETE CASCADE,
        CONSTRAINT fk_schedule_responsible FOREIGN KEY (responsible_id) REFERENCES dbo.users(id)
    );
END;
GO

IF OBJECT_ID(N'dbo.dicom_configs', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.dicom_configs
    (
        id                INT IDENTITY(1,1) NOT NULL CONSTRAINT pk_dicom_configs PRIMARY KEY,
        equipment_id      INT NOT NULL CONSTRAINT uq_dicom_equipment UNIQUE,
        ae_title          NVARCHAR(100) NULL,
        ip_address        VARCHAR(45) NULL,
        port              INT NULL,
        anidesk            NVARCHAR(150) NULL,
        username          NVARCHAR(150) NULL,
        encrypted_password NVARCHAR(500) NULL,
        observations      NVARCHAR(MAX) NULL,
        created_at        DATETIME2(3) NOT NULL CONSTRAINT df_dicom_created DEFAULT (SYSUTCDATETIME()),
        updated_at        DATETIME2(3) NOT NULL CONSTRAINT df_dicom_updated DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT fk_dicom_equipment FOREIGN KEY (equipment_id) REFERENCES dbo.equipment(id) ON DELETE CASCADE,
        CONSTRAINT ck_dicom_port CHECK (port IS NULL OR port BETWEEN 1 AND 65535)
    );
END;
GO

IF COL_LENGTH(N'dbo.equipment', N'provider') IS NULL
    ALTER TABLE dbo.equipment ADD provider NVARCHAR(200) NULL;

IF COL_LENGTH(N'dbo.maintenance', N'responsible') IS NULL
    ALTER TABLE dbo.maintenance ADD responsible NVARCHAR(150) NULL;

IF COL_LENGTH(N'dbo.incidents', N'reporter_name') IS NULL
    ALTER TABLE dbo.incidents ADD reporter_name NVARCHAR(150) NULL;
IF COL_LENGTH(N'dbo.equipment', N'warranty_expiration') IS NULL
    ALTER TABLE dbo.equipment ADD warranty_expiration DATETIME2(3) NULL;
IF COL_LENGTH(N'dbo.equipment', N'technical_responsible') IS NULL
    ALTER TABLE dbo.equipment ADD technical_responsible NVARCHAR(200) NULL;
IF COL_LENGTH(N'dbo.equipment', N'maintenance_frequency') IS NULL
    ALTER TABLE dbo.equipment ADD maintenance_frequency NVARCHAR(100) NULL;
IF COL_LENGTH(N'dbo.contracts', N'automatic_renewal') IS NULL
    ALTER TABLE dbo.contracts ADD automatic_renewal BIT NULL;
IF COL_LENGTH(N'dbo.contracts', N'with_parts') IS NULL
    ALTER TABLE dbo.contracts ADD with_parts BIT NULL;
IF COL_LENGTH(N'dbo.licenses', N'initial_date') IS NULL
    ALTER TABLE dbo.licenses ADD initial_date DATETIME2(3) NULL;
IF COL_LENGTH(N'dbo.licenses', N'tramit_date') IS NULL
    ALTER TABLE dbo.licenses ADD tramit_date DATETIME2(3) NULL;
IF COL_LENGTH(N'dbo.incidents', N'report_number') IS NULL
    ALTER TABLE dbo.incidents ADD report_number NVARCHAR(100) NULL;
IF COL_LENGTH(N'dbo.incidents', N'responsible') IS NULL
    ALTER TABLE dbo.incidents ADD responsible NVARCHAR(150) NULL;
IF COL_LENGTH(N'dbo.dicom_configs', N'ris_ae_title') IS NULL
    ALTER TABLE dbo.dicom_configs ADD ris_ae_title NVARCHAR(100) NULL;
IF COL_LENGTH(N'dbo.dicom_configs', N'ris_ip_address') IS NULL
    ALTER TABLE dbo.dicom_configs ADD ris_ip_address VARCHAR(45) NULL;
IF COL_LENGTH(N'dbo.dicom_configs', N'ris_port') IS NULL
    ALTER TABLE dbo.dicom_configs ADD ris_port INT NULL;
IF COL_LENGTH(N'dbo.dicom_configs', N'pacs_ip_address') IS NULL
    ALTER TABLE dbo.dicom_configs ADD pacs_ip_address VARCHAR(45) NULL;
IF COL_LENGTH(N'dbo.dicom_configs', N'pacs_port') IS NULL
    ALTER TABLE dbo.dicom_configs ADD pacs_port INT NULL;
IF COL_LENGTH(N'dbo.dicom_configs', N'pacs_ae_title') IS NULL
    ALTER TABLE dbo.dicom_configs ADD pacs_ae_title NVARCHAR(100) NULL;
GO

IF OBJECT_ID(N'dbo.blocks', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.blocks
    (
        id          INT IDENTITY(1,1) NOT NULL CONSTRAINT pk_blocks PRIMARY KEY,
        equipment_id INT NOT NULL,
        start_date  DATETIME2(3) NOT NULL,
        end_date    DATETIME2(3) NOT NULL,
        reason      NVARCHAR(MAX) NOT NULL,
        status      NVARCHAR(30) NOT NULL CONSTRAINT df_blocks_status DEFAULT (N'SCHEDULED'),
        created_by  INT NULL,
        created_at  DATETIME2(3) NOT NULL CONSTRAINT df_blocks_created DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT fk_blocks_equipment FOREIGN KEY (equipment_id) REFERENCES dbo.equipment(id) ON DELETE CASCADE,
        CONSTRAINT fk_blocks_user FOREIGN KEY (created_by) REFERENCES dbo.users(id),
        CONSTRAINT ck_blocks_dates CHECK (end_date >= start_date)
    );
END;
GO

IF OBJECT_ID(N'dbo.notifications', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.notifications
    (
        id             INT IDENTITY(1,1) NOT NULL CONSTRAINT pk_notifications PRIMARY KEY,
        user_id        INT NULL,
        type           NVARCHAR(50) NOT NULL,
        title          NVARCHAR(200) NOT NULL,
        message        NVARCHAR(MAX) NOT NULL,
        reference_type NVARCHAR(50) NULL,
        reference_id   INT NULL,
        read_at        DATETIME2(3) NULL,
        created_at     DATETIME2(3) NOT NULL CONSTRAINT df_notifications_created DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES dbo.users(id)
    );
END;
GO

IF OBJECT_ID(N'dbo.audit_logs', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.audit_logs
    (
        id         INT IDENTITY(1,1) NOT NULL CONSTRAINT pk_audit_logs PRIMARY KEY,
        user_id    INT NULL,
        action     NVARCHAR(50) NOT NULL,
        entity     NVARCHAR(100) NOT NULL,
        entity_id  INT NULL,
        old_data   NVARCHAR(MAX) NULL,
        new_data   NVARCHAR(MAX) NULL,
        ip_address VARCHAR(45) NULL,
        created_at DATETIME2(3) NOT NULL CONSTRAINT df_audit_created DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT fk_audit_user FOREIGN KEY (user_id) REFERENCES dbo.users(id)
    );
END;
GO

/* Índices para búsquedas, vencimientos, cronograma y dashboard. */
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'ix_equipment_name' AND object_id = OBJECT_ID(N'dbo.equipment'))
    CREATE INDEX ix_equipment_name ON dbo.equipment(name);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'ix_equipment_brand' AND object_id = OBJECT_ID(N'dbo.equipment'))
    CREATE INDEX ix_equipment_brand ON dbo.equipment(brand);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'ix_equipment_area' AND object_id = OBJECT_ID(N'dbo.equipment'))
    CREATE INDEX ix_equipment_area ON dbo.equipment(area_id);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'ix_maintenance_equipment' AND object_id = OBJECT_ID(N'dbo.maintenance'))
    CREATE INDEX ix_maintenance_equipment ON dbo.maintenance(equipment_id);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'ix_maintenance_scheduled_date' AND object_id = OBJECT_ID(N'dbo.maintenance'))
    CREATE INDEX ix_maintenance_scheduled_date ON dbo.maintenance(scheduled_date);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'ix_incidents_equipment' AND object_id = OBJECT_ID(N'dbo.incidents'))
    CREATE INDEX ix_incidents_equipment ON dbo.incidents(equipment_id);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'ix_incidents_status' AND object_id = OBJECT_ID(N'dbo.incidents'))
    CREATE INDEX ix_incidents_status ON dbo.incidents(status);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'ix_licenses_expiration' AND object_id = OBJECT_ID(N'dbo.licenses'))
    CREATE INDEX ix_licenses_expiration ON dbo.licenses(expiration_date);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'ix_calibrations_next' AND object_id = OBJECT_ID(N'dbo.calibrations'))
    CREATE INDEX ix_calibrations_next ON dbo.calibrations(next_calibration_date);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'ix_schedule_date' AND object_id = OBJECT_ID(N'dbo.maintenance_schedule'))
    CREATE INDEX ix_schedule_date ON dbo.maintenance_schedule(scheduled_date);
GO

/* Catálogos iniciales usados por el seed de la aplicación. */
INSERT INTO dbo.roles (name, description)
SELECT v.name, v.description
FROM (VALUES
    (N'ADMIN', N'Administrador con acceso completo'),
    (N'TECHNICIAN', N'Técnico biomédico'),
    (N'SUPERVISOR', N'Supervisor'),
    (N'VIEWER', N'Consulta solo lectura')
) v(name, description)
WHERE NOT EXISTS (SELECT 1 FROM dbo.roles r WHERE r.name = v.name);

INSERT INTO dbo.areas (name, code, location)
SELECT v.name, v.code, v.location
FROM (VALUES
    (N'Radiología', N'RAD', N'Piso 1'),
    (N'Tomografía', N'TOM', N'Piso 1'),
    (N'Resonancia', N'RMN', N'Piso 2'),
    (N'Urgencias', N'URG', N'Piso 0'),
    (N'UCI', N'UCI', N'Piso 3'),
    (N'Hospitalización', N'HOS', N'Piso 4'),
    (N'Quirófano', N'QUI', N'Piso 2')
) v(name, code, location)
WHERE NOT EXISTS (SELECT 1 FROM dbo.areas a WHERE a.code = v.code);
GO

/* Consultas rápidas de los indicadores principales. */
CREATE OR ALTER VIEW dbo.vw_bioguard_dashboard
AS
SELECT
    (SELECT COUNT(*) FROM dbo.equipment) AS total_equipment,
    (SELECT COUNT(*) FROM dbo.equipment WHERE status = N'ACTIVE') AS active_equipment,
    (SELECT COUNT(*) FROM dbo.maintenance WHERE status IN (N'SCHEDULED', N'IN_PROGRESS', N'OVERDUE')) AS pending_maintenance,
    (SELECT COUNT(*) FROM dbo.maintenance WHERE type = N'PREVENTIVE' AND status IN (N'SCHEDULED', N'IN_PROGRESS', N'OVERDUE')) AS pending_preventive,
    (SELECT COUNT(*) FROM dbo.maintenance WHERE type = N'CORRECTIVE' AND status IN (N'SCHEDULED', N'IN_PROGRESS', N'OVERDUE')) AS pending_corrective,
    (SELECT COUNT(*) FROM dbo.incidents WHERE status NOT IN (N'RESOLVED', N'CLOSED')) AS open_incidents,
    (SELECT COUNT(*) FROM dbo.incidents WHERE priority = N'CRITICAL' AND status NOT IN (N'RESOLVED', N'CLOSED')) AS critical_incidents;
GO

SELECT name AS tabla
FROM sys.tables
WHERE name IN
(
    N'roles', N'users', N'areas', N'equipment', N'equipment_documents',
    N'contracts', N'licenses', N'calibrations', N'quality_controls',
    N'maintenance', N'maintenance_documents', N'incidents',
    N'maintenance_schedule', N'dicom_configs', N'blocks',
    N'notifications', N'audit_logs'
)
ORDER BY name;
GO
