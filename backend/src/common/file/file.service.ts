import { Injectable, NotFoundException } from '@nestjs/common';
import type { Response } from 'express';
import * as path from 'node:path';
import { PrismaService } from '../../prisma/prisma.service';

const MIME: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.pdf': 'application/pdf',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
};
const TAMPIL_DI_BROWSER = new Set(['image/jpeg', 'image/png', 'image/svg+xml', 'application/pdf']);

export const mimeDariNama = (nama: string) =>
  MIME[path.extname(nama).toLowerCase()] ?? 'application/octet-stream';

@Injectable()
export class FileService {
  constructor(private prisma: PrismaService) {}

  async simpan(file: Express.Multer.File, opsi: { publik?: boolean } = {}) {
    const row = await this.prisma.file.create({
      data: {
        namaAsli: file.originalname,
        mimeType: mimeDariNama(file.originalname),
        ukuran: file.size,
        publik: opsi.publik ?? false,
        data: file.buffer,
      },
      select: { id: true },
    });
    return row.id;
  }

  async hapus(id?: string | null) {
    if (!id) return;
    await this.prisma.file.deleteMany({ where: { id } });
  }

  async metadataBanyak(ids: string[]) {
    if (ids.length === 0) return [];
    return this.prisma.file.findMany({
      where: { id: { in: ids } },
      select: { id: true, mimeType: true, namaAsli: true },
    });
  }

  async kirim(res: Response, id: string, opsi: { publikSaja?: boolean } = {}) {
    const file = await this.prisma.file.findUnique({ where: { id } });
    if (!file || (opsi.publikSaja && !file.publik)) {
      throw new NotFoundException('File tidak ditemukan.');
    }

    const tampil = TAMPIL_DI_BROWSER.has(file.mimeType);
    res.set({
      'Content-Type': file.mimeType,
      'Content-Length': String(file.data.length),
      'Content-Disposition': `${tampil ? 'inline' : 'attachment'}; filename*=UTF-8''${encodeURIComponent(file.namaAsli)}`,
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': file.publik ? 'public, max-age=86400' : 'private, no-store',
    });
    res.end(Buffer.from(file.data));
  }
}
