import { BadRequestException } from '@nestjs/common';
import { memoryStorage } from 'multer';
import * as path from 'node:path';

/**
 * Opsi multer bersama: file ditahan di memori (file.buffer) lalu disimpan ke database
 * lewat FileService, bukan ditulis ke folder uploads/.
 */
export function buatMulterOptions(ekstensi: RegExp, pesanTipe: string, maksMb: number) {
  return {
    storage: memoryStorage(),
    fileFilter: (_req: any, file: Express.Multer.File, callback: any) => {
      if (!ekstensi.test(path.extname(file.originalname))) {
        return callback(new BadRequestException(pesanTipe), false);
      }
      callback(null, true);
    },
    limits: { fileSize: maksMb * 1024 * 1024 },
  };
}
