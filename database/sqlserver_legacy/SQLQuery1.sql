USE master;
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.sql_logins WHERE name = N'bioguard'
)
BEGIN
    CREATE LOGIN [bioguard]
    WITH PASSWORD = 'admin123',
         CHECK_POLICY = OFF;
END
ELSE
BEGIN
    ALTER LOGIN [bioguard]
    WITH PASSWORD = 'admin123';
END;
GO

ALTER LOGIN [bioguard] ENABLE;
GO

USE bioguard;
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.database_principals WHERE name = N'bioguard'
)
BEGIN
    CREATE USER [bioguard] FOR LOGIN [bioguard];
END;
GO

ALTER ROLE [db_owner] ADD MEMBER [bioguard];
GO