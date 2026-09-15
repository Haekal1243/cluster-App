import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Role, TipeNotifikasi } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class NotifikasiService {
  constructor(private prisma: PrismaService) {}

  kirim(idUser: number, tipe: TipeNotifikasi, judul: string, pesan: string, link?: string) {
    return this.prisma.notifikasi.create({
      data: { idUser, tipe, judul, pesan, link },
    });
  }

  kirimBanyak(
    idUserList: number[],
    tipe: TipeNotifikasi,
    judul: string,
    pesan: string,
    link?: string,
  ) {
    const unique = [...new Set(idUserList)];
    if (unique.length === 0) return Promise.resolve();
    return this.prisma.notifikasi.createMany({
      data: unique.map((idUser) => ({ idUser, tipe, judul, pesan, link })),
    });
  }

  async kirimKeRole(
    roles: Role[],
    tipe: TipeNotifikasi,
    judul: string,
    pesan: string,
    link?: string,
  ) {
    const users = await this.prisma.user.findMany({
      where: { role: { in: roles } },
      select: { id: true },
    });
    return this.kirimBanyak(users.map((u) => u.id), tipe, judul, pesan, link);
  }

  findByUser(userId: number) {
    return this.prisma.notifikasi.findMany({
      where: { idUser: userId },
      orderBy: { createdAt: 'desc' },
      take: 30,
    });
  }

  async markRead(id: number, userId: number) {
    const notif = await this.prisma.notifikasi.findUnique({ where: { id } });
    if (!notif) {
      throw new NotFoundException(`Notifikasi dengan ID ${id} tidak ditemukan`);
    }
    if (notif.idUser !== userId) {
      throw new ForbiddenException('Anda tidak berhak mengubah notifikasi ini');
    }
    return this.prisma.notifikasi.update({
      where: { id },
      data: { isRead: true },
    });
  }

  async markAllRead(userId: number) {
    await this.prisma.notifikasi.updateMany({
      where: { idUser: userId, isRead: false },
      data: { isRead: true },
    });
    return { message: 'Semua notifikasi ditandai sudah dibaca' };
  }
}
