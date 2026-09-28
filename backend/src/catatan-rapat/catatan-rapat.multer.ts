import { BadRequestException } from '@nestjs/common';
import * as fs from 'node:fs';
import { diskStorage } from 'multer';
import * as path from 'node:path';

const uploadDir = path.join(process.cwd(), 'uploads', 'catatan-rapat');

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const allowedExtensions = /\.(pdf|doc|docx|jpg|jpeg|png)$/i;

export const catatanRapatMulterOptions = {
  storage: diskStorage({
    destination: uploadDir,
    filename: (_req, file, callback) => {
      const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      callback(null, `${uniqueSuffix}${path.extname(file.originalname)}`);
    },
  }),
  fileFilter: (_req: any, file: Express.Multer.File, callback: any) => {
    if (!allowedExtensions.test(path.extname(file.originalname))) {
      return callback(
        new BadRequestException('Tipe file tidak didukung. Gunakan PDF, DOC/DOCX, JPG, atau PNG.'),
        false,
      );
    }
    callback(null, true);
  },
  limits: { fileSize: 10 * 1024 * 1024 },
};
