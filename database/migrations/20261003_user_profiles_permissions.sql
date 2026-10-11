/* Perfiles configurables y permisos por módulo. Ejecutar después de las migraciones existentes. */

IF COL_LENGTH(N'dbo.roles', N'active') IS NULL
  ALTER TABLE dbo.roles ADD active BIT NOT NULL CONSTRAINT df_roles_active DEFAULT (1);
IF COL_LENGTH(N'dbo.roles', N'is_system') IS NULL
  ALTER TABLE dbo.roles ADD is_system BIT NOT NULL CONSTRAINT df_roles_is_system DEFAULT (0);
IF COL_LENGTH(N'dbo.roles', N'created_at') IS NULL
  ALTER TABLE dbo.roles ADD created_at DATETIME2(3) NOT NULL CONSTRAINT df_roles_created_at DEFAULT (SYSUTCDATETIME());
IF COL_LENGTH(N'dbo.roles', N'updated_at') IS NULL
  ALTER TABLE dbo.roles ADD updated_at DATETIME2(3) NOT NULL CONSTRAINT df_roles_updated_at DEFAULT (SYSUTCDATETIME());

IF COL_LENGTH(N'dbo.users', N'last_login_at') IS NULL
  ALTER TABLE dbo.users ADD last_login_at DATETIME2(3) NULL;
IF COL_LENGTH(N'dbo.users', N'session_version') IS NULL
  ALTER TABLE dbo.users ADD session_version INT NOT NULL CONSTRAINT df_users_session_version DEFAULT (0);

IF OBJECT_ID(N'dbo.permissions', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.permissions (
    id INT IDENTITY(1,1) NOT NULL CONSTRAINT pk_permissions PRIMARY KEY,
    [key] NVARCHAR(150) NOT NULL CONSTRAINT uq_permissions_key UNIQUE,
    module NVARCHAR(100) NOT NULL,
    action NVARCHAR(50) NOT NULL,
    description NVARCHAR(255) NULL
  );
  CREATE INDEX ix_permissions_module ON dbo.permissions(module);
END;

IF OBJECT_ID(N'dbo.role_permissions', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.role_permissions (
    role_id INT NOT NULL,
    permission_id INT NOT NULL,
    CONSTRAINT pk_role_permissions PRIMARY KEY (role_id, permission_id),
    CONSTRAINT fk_role_permissions_role FOREIGN KEY (role_id) REFERENCES dbo.roles(id) ON DELETE CASCADE,
    CONSTRAINT fk_role_permissions_permission FOREIGN KEY (permission_id) REFERENCES dbo.permissions(id) ON DELETE CASCADE
  );
END;
