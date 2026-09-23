import { BadRequestException } from '@nestjs/common';
import * as fs from 'node:fs';
import { diskStorage } from 'multer';
import * as path from 'node:path';

const uploadDir = path.join(process.cwd(), 'uploads', 'keuangan');

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const allowedExtensions = /\.(jpg|jpeg|png|pdf)$/i;

export const keuanganMulterOptions = {
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
        new BadRequestException(
          'Tipe file tidak didukung. Gunakan JPG, PNG, atau PDF.',
        ),
        false,
      );
    }
    callback(null, true);
  },
  limits: { fileSize: 5 * 1024 * 1024 },
};
