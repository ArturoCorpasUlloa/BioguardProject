import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import authRoutes from './routes/authRoutes.js';
import areaRoutes from './routes/areaRoutes.js';
import equipmentRoutes from './routes/equipmentRoutes.js';
import operationsRoutes from './routes/operationsRoutes.js';
import exportRoutes from './routes/exportRoutes.js';
import invoiceAuditRoutes from './routes/invoiceAuditRoutes.js';
import userRoutes from './routes/userRoutes.js';
import { errorHandler } from './middlewares/auth.js';
import { uploadDir } from './utils/uploads.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || '0.0.0.0';
const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(helmet());
app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

app.use('/uploads', express.static(uploadDir));

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', app: 'BioGuard' });
});

app.use('/api/auth', authRoutes);
app.use('/api/admin', userRoutes);
app.use('/api/areas', areaRoutes);
app.use('/api/equipment', equipmentRoutes);
app.use('/api', operationsRoutes);
app.use('/api/export', exportRoutes);
app.use('/api/invoice-audits', invoiceAuditRoutes);

if (process.env.NODE_ENV === 'production') {
  const clientDist = path.resolve(__dirname, '../../client/dist');
  app.use(express.static(clientDist));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

app.use(errorHandler);

app.listen(PORT, HOST, () => {
  console.log(`BioGuard API escuchando en ${HOST}:${PORT}`);
});
