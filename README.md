# BioGuard

Sistema integral de gestión de equipos biomédicos. Usa SQL Server local o remoto.

Ubicación: `C:\Users\corpa\OneDrive\Desktop\bioguard`

## Requisitos

- Node.js 20+
- npm
- SQL Server 2019+ y una base de datos llamada `bioguard`

Antes de instalar, crea la base de datos y habilita la autenticación SQL en SQL Server.
Después configura una `DATABASE_URL` válida en `server/.env`. El valor de ejemplo es:

```env
DATABASE_URL="sqlserver://localhost;database=bioguard;integratedSecurity=true;trustServerCertificate=true;connection_limit=1"
```

Conectado como administrador en SQL Server puedes crear la base y un usuario dedicado:

```sql
CREATE DATABASE bioguard;
GO
USE bioguard;
GO
CREATE LOGIN bioguard WITH PASSWORD = 'elige-una-clave';
CREATE USER bioguard FOR LOGIN bioguard;
ALTER ROLE db_owner ADD MEMBER bioguard;
GO
```

Después actualiza `server/.env` usando ese usuario y contraseña. También puedes usar `sa`
si tu instalación lo permite. La opción `trustServerCertificate=true` está pensada para
una instalación local con certificado autofirmado.

Si tienes una instancia nombrada como `SQLEXPRESS`, usa una URL de este tipo en lugar
de la URL con puerto:

```env
DATABASE_URL="sqlserver://localhost;instance=SQLEXPRESS;database=bioguard;integratedSecurity=true;trustServerCertificate=true"
```

Para una instancia predeterminada usando `localhost` sin puerto, el servicio SQL Server
debe estar iniciado. Si usas una instancia con puerto fijo, incluye ese puerto en la URL
y habilita TCP/IP desde SQL Server Configuration Manager. La instancia predeterminada usa el servicio `MSSQLSERVER`; una instancia Express usa
`MSSQL$SQLEXPRESS`. El proyecto detecta ambos servicios, pero no puede cambiar por sí
solo un puerto dinámico o habilitar TCP/IP sin permisos administrativos.

### Configuración permanente de SQL Server Express

La habilitación de TCP/IP y el puerto fijo se configuran una sola vez. Abre
PowerShell **como administrador** y ejecuta:

```powershell
$tcp = "HKLM:\SOFTWARE\Microsoft\Microsoft SQL Server\MSSQL16.SQLEXPRESS\MSSQLServer\SuperSocketNetLib\Tcp"
$ipAll = "$tcp\IPAll"

Set-ItemProperty $tcp -Name Enabled -Value 1
Set-ItemProperty $ipAll -Name TcpPort -Value "1434"
Set-ItemProperty $ipAll -Name TcpDynamicPorts -Value ""
Set-Service -Name "MSSQL`$SQLEXPRESS" -StartupType Automatic
Restart-Service "MSSQL`$SQLEXPRESS"
```

Después de esto no es necesario repetir esos comandos al ejecutar `npm run dev`.
El proyecto comprueba e inicia el servicio automáticamente antes de levantar la
aplicación. Solo debes volver a ejecutar la
configuración si reinstalas SQL Server, cambias de instancia o modificas el puerto.

## Instalación (primera vez)

Abre PowerShell en esta carpeta y ejecuta:

```powershell
.\instalar.bat
```

O manualmente:

```powershell
npm install
npm install --prefix server
npm install --prefix client
copy server\.env.example server\.env
npm run setup
```

## Ejecutar la aplicación

Doble clic en **`iniciar.bat`** o en PowerShell:

```powershell
npm run dev
```

- App: http://localhost:5173
- API: http://localhost:3001/api/health

**Usuario demo:** `admin@bioguard.local` / `admin123`

### Acceso desde la red local

La aplicación escucha en todas las interfaces de red (`0.0.0.0`). Para acceder
desde otro equipo conectado a la misma red:

1. En el equipo servidor, ejecuta `ipconfig` y anota la dirección IPv4, por ejemplo
   `192.168.1.25`.
2. Permite los puertos en el Firewall de Windows, ejecutando PowerShell como
   administrador:

   ```powershell
   New-NetFirewallRule -DisplayName "BioGuard Frontend" -Direction Inbound -Action Allow -Protocol TCP -LocalPort 5173
   New-NetFirewallRule -DisplayName "BioGuard API" -Direction Inbound -Action Allow -Protocol TCP -LocalPort 3001
   ```

3. Inicia la aplicación y abre `http://192.168.1.25:5173` desde el otro equipo.

El acceso local continúa disponible en `http://localhost:5173`.

## Base de datos

`npm run setup` crea o actualiza las tablas de SQL Server con Prisma y carga los datos demo.
El comando es idempotente: el seed usa `upsert` para roles y usuario, y no duplica las áreas.

Para aplicar el esquema manualmente:

```powershell
npm run db:push
npm run db:seed
```

Para actualizar una base existente con los campos de proveedor, documentos
clasificados, usuario que cargó cada documento y reprogramación del cronograma,
ejecuta en SQL Server:

```powershell
sqlcmd -S localhost,1434 -d bioguard -E -i database\migrations\20260923_extend_bioguard.sql
```

La migración es idempotente. En instalaciones con autenticación SQL reemplaza
`-E` por `-U usuario -P contraseña`. Después ejecuta `npm run db:generate`.

## Módulos

- Login con roles (Admin, Técnico, Supervisor, Consulta)
- Panel con indicadores y gráficos
- CRUD de equipos / hojas de vida
- Mantenimientos y novedades
- Cronograma anual
- Licencias, contratos, calidad, AETitle/IP

### Carga masiva desde Excel

Las vistas de equipos y de los módulos operativos permiten descargar una plantilla
`.xlsx`, diligenciarla y usar **Importar Excel** para crear los registros en lote.
Los encabezados de la plantilla están en español y corresponden a los campos del
formulario. El importador también acepta los encabezados técnicos anteriores y
tolera diferencias de mayúsculas y tildes. En campos de relación como `Equipo` o
`ID del área` se debe usar el ID numérico correspondiente.

## Script SQL Server

Para crear la base directamente en SQL Server Management Studio, ejecuta
`database\bioguard.sql` conectado a `localhost,1434`. El script crea la
base `bioguard`, sus 17 tablas, relaciones, índices, catálogos iniciales y la
vista `vw_bioguard_dashboard`.

Para una instancia nombrada, la URL de `server\.env` debe incluir la contraseña
con esta forma:

```env
DATABASE_URL="sqlserver://localhost;instance=SQLEXPRESS;database=bioguard;integratedSecurity=true;trustServerCertificate=true"
```
