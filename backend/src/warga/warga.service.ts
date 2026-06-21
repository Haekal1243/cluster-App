// src/warga/warga.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateWargaDto } from './dto/create-warga.dto';
import { UpdateWargaDto } from './dto/update-warga.dto';
import { PrismaService } from '../prisma/prisma.service'; // Sesuaikan path

@Injectable()
export class WargaService {
  constructor(private prisma: PrismaService) {}

  async create(createWargaDto: CreateWargaDto) {
    // Role otomatis menjadi WARGA sesuai default di schema Prisma
    return this.prisma.user.create({
      data: createWargaDto,
    });
  }

  async findAll() {
    // Mengambil semua user yang memiliki role WARGA
    return this.prisma.user.findMany({
      where: { role: 'WARGA' },
      include: { rumah: true } // Opsional: langsung tarik data rumahnya jika ada
    });
  }

  async findOne(id: number) {
    const warga = await this.prisma.user.findFirst({
      where: { id, role: 'WARGA' },
      include: { rumah: true }
    });

    if (!warga) {
      throw new NotFoundException(`Warga dengan ID ${id} tidak ditemukan`);
    }
    return warga;
  }

  async update(id: number, updateWargaDto: UpdateWargaDto) {
    await this.findOne(id); 

    return this.prisma.user.update({
      where: { id },
      data: updateWargaDto,
    });
  }

  async remove(id: number) {
    await this.findOne(id); // Pastikan data ada

    return this.prisma.user.delete({
      where: { id },
    });
  }
}