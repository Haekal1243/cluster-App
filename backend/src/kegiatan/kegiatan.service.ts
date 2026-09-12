import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { PrismaService } from '../prisma/prisma.service';
import { CreateKegiatanDto } from './dto/create-kegiatan.dto';
import { UpdateKegiatanDto } from './dto/update-kegiatan.dto';
import { UpdateStatusKegiatanDto } from './dto/update-status-kegiatan.dto';

@Injectable()
export class KegiatanService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateKegiatanDto, file?: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Gambar kegiatan wajib diunggah');
    }

    const data = await this.prisma.kegiatan.create({
      data: {
        judul: dto.judul,
        deskripsi: dto.deskripsi,
        tanggalAcara: new Date(dto.tanggalAcara),
        status: dto.status,
        gambarUrl: file.filename,
        createBy: dto.createBy,
      },
    });

    return { message: 'Kegiatan berhasil dibuat', data };
  }

  findAll() {
    return this.prisma.kegiatan.findMany({
      where: { isDelete: false },
      orderBy: { tanggalAcara: 'desc' },
    });
  }

  findActive() {
    return this.prisma.kegiatan.findMany({
      where: { isDelete: false, status: 'active' },
      orderBy: { tanggalAcara: 'desc' },
      take: 5,
      select: {
        id: true,
        judul: true,
        deskripsi: true,
        gambarUrl: true,
        tanggalAcara: true,
      },
    });
  }

  async findOne(id: number) {
    const kegiatan = await this.prisma.kegiatan.findFirst({
      where: { id, isDelete: false },
    });

    if (!kegiatan) {
      throw new NotFoundException(`Kegiatan dengan ID ${id} tidak ditemukan`);
    }
    return kegiatan;
  }

  async update(id: number, dto: UpdateKegiatanDto, file?: Express.Multer.File) {
    const existing = await this.findOne(id);

    if (file && existing.gambarUrl) {
      this.deleteFile(existing.gambarUrl);
    }

    const data = await this.prisma.kegiatan.update({
      where: { id },
      data: {
        judul: dto.judul,
        deskripsi: dto.deskripsi,
        tanggalAcara: dto.tanggalAcara ? new Date(dto.tanggalAcara) : undefined,
        status: dto.status,
        gambarUrl: file?.filename,
        updateBy: dto.updateBy,
        updatedAt: new Date(),
      },
    });

    return { message: 'Kegiatan berhasil diperbarui', data };
  }

  async updateStatus(id: number, dto: UpdateStatusKegiatanDto) {
    await this.findOne(id);

    const data = await this.prisma.kegiatan.update({
      where: { id },
      data: { status: dto.status, updateBy: dto.updateBy, updatedAt: new Date() },
    });

    return { message: 'Status kegiatan berhasil diperbarui', data };
  }

  async remove(id: number) {
    await this.findOne(id);

    await this.prisma.kegiatan.update({
      where: { id },
      data: { isDelete: true },
    });

    return { message: 'Kegiatan berhasil dihapus' };
  }

  private deleteFile(filename: string) {
    const filePath = path.join(process.cwd(), 'uploads', 'kegiatan', filename);
    if (fs.existsSync(filePath)) {
      fs.unlink(filePath, () => undefined);
    }
  }
}
