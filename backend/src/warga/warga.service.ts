import { Injectable, NotFoundException, ConflictException, UnauthorizedException } from '@nestjs/common';
import { CreateWargaDto } from './dto/create-warga.dto';
import { UpdateWargaDto } from './dto/update-warga.dto';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '@prisma/client'; 

@Injectable()
export class WargaService {
  constructor(private prisma: PrismaService) {}

  // ================= TAMBAHKAN FUNGSI LOGIN DI SINI =================
  async login(email: string, pass: string) {
    const user = await this.prisma.user.findFirst({
      where: { email: email },
    });

    if (!user) {
      throw new UnauthorizedException('Email tidak ditemukan!');
    }

    if (user.password !== pass) {
      throw new UnauthorizedException('Password salah!');
    }

    return {
      message: 'Login berhasil',
      user: {
        id: user.id,
        nama: user.namaUser, // Menggunakan namaUser sesuai skema Anda
        email: user.email,
        role: user.role,
      },
    };
  }
  // ==================================================================

  async create(createWargaDto: CreateWargaDto) {
    try {
      const newUser = await this.prisma.user.create({
        data: {
          namaUser: createWargaDto.nama, 
          noTelp: createWargaDto.no_hp,
          email: createWargaDto.email,
          password: createWargaDto.password,
          role: Role.WARGA, 
          
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
      include: { rumah: true } 
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