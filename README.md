# BioGuard

Sistema para la gestión de equipos biomédicos, mantenimientos, incidentes,
contratos, licencias, calidad, auditoría de facturas, permisos y reportes.

## Arquitectura

- `client/`: React + Vite.
- `server/`: API Node.js + Express.
- Prisma: ORM y migraciones.
- PostgreSQL: base de datos local y de producción.
- Render: frontend y backend como servicios independientes.

## Requisitos

- Node.js 20 o superior.
- npm.
- Docker Desktop.

## Instalación local

Desde esta carpeta:

```powershell
npm install
npm install --prefix server
npm install --prefix client
Copy-Item server\.env.example server\.env
Copy-Item client\.env.example client\.env
docker compose up -d postgres
npm run db:generate
npm run db:deploy
npm run db:seed
npm run dev
```

PostgreSQL local usa el puerto `5433` para no interferir con instalaciones de
PostgreSQL que ya existan en Windows.

## URLs locales

- Frontend: <http://localhost:5173>
- API: <http://localhost:3001>
- Health check: <http://localhost:3001/api/health>

Usuario demo:

```text
admin@bioguard.local / admin123
```

## Estructura

```text
bioguard/
├── client/                 # Aplicación React/Vite
├── server/                 # API Express
│   └── prisma/             # Esquema y migraciones PostgreSQL
├── database/               # Scripts históricos y documentación
├── docker-compose.yml      # PostgreSQL local
└── README.md
```

## Variables de entorno

No subas los archivos `.env`. Usa como referencia:

- `server/.env.example`
- `client/.env.example`

El backend requiere `DATABASE_URL`, `JWT_SECRET` y `ENCRYPTION_KEY`.
En producción deben ser secretos largos y aleatorios.

## Comandos

```powershell
npm run dev
npm run build
npm run db:generate
npm run db:migrate
npm run db:deploy
npm run db:seed
```

## Archivos cargados

Durante el desarrollo se guardan en `uploads/`. En producción se debe usar
Cloudinary, Cloudflare R2 o Amazon S3, porque el disco local de Render no debe
considerarse almacenamiento permanente.

## Despliegue

1. Crear PostgreSQL administrado en Render.
2. Crear un Web Service con `server/`.
3. Crear un Static Site con `client/`.
4. Configurar `DATABASE_URL`, `CLIENT_URL`, `JWT_SECRET`,
   `JWT_EXPIRES_IN`, `JWT_ISSUER`, `JWT_AUDIENCE` y `ENCRYPTION_KEY` en el
   backend.
5. Configurar `VITE_API_URL` en el frontend.

### Backend en Render

```text
Root Directory: server
Build Command: npm install && npx prisma generate && npx prisma migrate deploy
Start Command: npm start
```

### Frontend en Render

```text
Root Directory: client
Build Command: npm install && npm run build
Publish Directory: dist
```

Configura la regla de rewrite de React Router:

```text
/*    /index.html    200
```

## Seguridad

No subas `.env`, contraseñas, claves JWT, bases locales, `node_modules`,
archivos cargados ni reportes generados.
