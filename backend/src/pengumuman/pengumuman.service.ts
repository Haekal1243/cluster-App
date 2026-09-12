import { Injectable, NotFoundException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePengumumanDto } from './dto/create-pengumuman.dto';
import { UpdatePengumumanDto } from './dto/update-pengumuman.dto';
import { UpdateStatusPengumumanDto } from './dto/update-status-pengumuman.dto';

@Injectable()
export class PengumumanService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreatePengumumanDto, file?: Express.Multer.File) {
    const data = await this.prisma.pengumuman.create({
      data: {
        judul: dto.judul,
        keteranganPengumuman: dto.keteranganPengumuman,
        status: dto.status,
        filePengumuman: file?.filename,
        createBy: dto.createBy,
      },
    });

    return { message: 'Pengumuman berhasil dibuat', data };
  }

  findAll() {
    return this.prisma.pengumuman.findMany({
      where: { isDelete: false },
      orderBy: { createDate: 'desc' },
    });
  }

  findActive() {
    return this.prisma.pengumuman.findMany({
      where: { isDelete: false, status: 'active' },
      orderBy: { createDate: 'desc' },
      take: 5,
      select: {
        id: true,
        judul: true,
        filePengumuman: true,
        keteranganPengumuman: true,
        createDate: true,
      },
    });
  }

  async findOne(id: number) {
    const pengumuman = await this.prisma.pengumuman.findFirst({
      where: { id, isDelete: false },
    });

    if (!pengumuman) {
      throw new NotFoundException(`Pengumuman dengan ID ${id} tidak ditemukan`);
    }
    return pengumuman;
  }

  async update(id: number, dto: UpdatePengumumanDto, file?: Express.Multer.File) {
    const existing = await this.findOne(id);

    if (file && existing.filePengumuman) {
      this.deleteFile(existing.filePengumuman);
    }

    const data = await this.prisma.pengumuman.update({
      where: { id },
      data: {
        judul: dto.judul,
        keteranganPengumuman: dto.keteranganPengumuman,
        status: dto.status,
        filePengumuman: file?.filename,
        updateBy: dto.updateBy,
      },
    });

    return { message: 'Pengumuman berhasil diperbarui', data };
  }

  async updateStatus(id: number, dto: UpdateStatusPengumumanDto) {
    await this.findOne(id);

    const data = await this.prisma.pengumuman.update({
      where: { id },
      data: { status: dto.status, updateBy: dto.updateBy },
    });

    return { message: 'Status pengumuman berhasil diperbarui', data };
  }

  async remove(id: number) {
    await this.findOne(id);

    await this.prisma.pengumuman.update({
      where: { id },
      data: { isDelete: true },
    });

    return { message: 'Pengumuman berhasil dihapus' };
  }

  private deleteFile(filename: string) {
    const filePath = path.join(process.cwd(), 'uploads', 'pengumuman', filename);
    if (fs.existsSync(filePath)) {
      fs.unlink(filePath, () => undefined);
    }
  }
}
