import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { CreateWargaDto } from './dto/create-warga.dto';
import { UpdateWargaDto } from './dto/update-warga.dto';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '@prisma/client'; 

@Injectable()
export class WargaService {
  constructor(private prisma: PrismaService) {}

  async create(createWargaDto: CreateWargaDto) {
    try {
      const newUser = await this.prisma.user.create({
        data: {
          namaUser: createWargaDto.nama, 
          noTelp: createWargaDto.no_hp,
          email: createWargaDto.email,
          password: createWargaDto.password,
          role: Role.WARGA, 
          
          // NESTED WRITE: Prisma otomatis memecah data dan memasukkannya ke tabel 'tb_Rumah'
          // dan langsung menyambungkan 'id_user' di tabel Rumah dengan User ini!
          rumah: {
            create: {
              rt: createWargaDto.rt,
              blokRumah: createWargaDto.blokRumah
            }
          }
        },
      });
      
      return {
        message: 'Akun warga dan data rumah berhasil dibuat!',
        data: newUser
      };
    } catch (error: any) { 
      if (error.code === 'P2002') {
        throw new ConflictException('Email ini sudah terdaftar. Silakan gunakan email lain.');
      }
      throw error;
    }
  }

  async findAll() {
    return this.prisma.user.findMany({
      where: { role: Role.WARGA }, 
      include: { rumah: true } // Akan menarik data User beserta data Rumah-nya
    });
  }

  async findOne(id: number) {
    const warga = await this.prisma.user.findFirst({
      where: { id, role: Role.WARGA }, 
      include: { rumah: true }
    });

    if (!warga) {
      throw new NotFoundException(`Warga dengan ID ${id} tidak ditemukan`);
    }
    return warga;
  }

  async update(id: number, updateWargaDto: UpdateWargaDto) {
    await this.findOne(id); 

    // Update pada tabel User (alamat tidak lagi di-update di sini karena beda tabel)
    return this.prisma.user.update({
      where: { id },
      data: {
        namaUser: updateWargaDto.nama,
        noTelp: updateWargaDto.no_hp,
        email: updateWargaDto.email,
        password: updateWargaDto.password,
      },
    });
  }

  async remove(id: number) {
    await this.findOne(id); 

    return this.prisma.user.delete({
      where: { id },
    });
  }
}