import { BadRequestException } from '@nestjs/common';
import * as fs from 'fs';
import { diskStorage } from 'multer';
import * as path from 'path';

const uploadDir = path.join(process.cwd(), 'uploads', 'bukti-bayar');

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const allowedExtensions = /\.(jpg|jpeg|png)$/i;

export const buktiMulterOptions = {
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
          'Tipe file tidak didukung. Gunakan JPG atau PNG.',
        ),
        false,
      );
    }
    callback(null, true);
  },
  limits: { fileSize: 5 * 1024 * 1024 },
};
