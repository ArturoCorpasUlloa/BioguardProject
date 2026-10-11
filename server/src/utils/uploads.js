import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();
export const uploadDir = path.resolve(process.cwd(), process.env.UPLOAD_DIR || '../uploads');
export const equipmentUploadDir = path.join(uploadDir, 'equipment');

fs.mkdirSync(equipmentUploadDir, { recursive: true });
