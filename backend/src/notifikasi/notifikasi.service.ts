import { ForbiddenException, Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Area, ScopeAkses, TipeNotifikasi } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PushService } from '../push/push.service';

const RETENSI_SETELAH_DIBACA_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class NotifikasiService implements OnApplicationBootstrap {
  private readonly logger = new Logger(NotifikasiService.name);

  constructor(
    private prisma: PrismaService,
    private pushService: PushService,
  ) {}

  onApplicationBootstrap() {
    this.hapusNotifikasiDibaca().catch((err) =>
      this.logger.error('Gagal menjalankan pembersihan notifikasi saat start', err),
    );
  }

  @Cron(CronExpression.EVERY_HOUR)
  async hapusNotifikasiDibaca() {
    const batas = new Date(Date.now() - RETENSI_SETELAH_DIBACA_MS);
    const { count } = await this.prisma.notifikasi.deleteMany({
      where: { isRead: true, readAt: { lte: batas } },
    });
    if (count > 0) this.logger.log(`Menghapus ${count} notifikasi yang sudah dibaca >1 hari.`);
  }

  private kirimPush(idUserList: number[], judul: string, pesan: string, link?: string | null) {
    this.pushService
      .kirimKeBanyak(idUserList, { title: judul, body: pesan, url: link })
      .catch((err) => this.logger.warn(`Gagal kirim push notification: ${err?.message ?? err}`));
  }

  async kirim(idUser: number, tipe: TipeNotifikasi, judul: string, pesan: string, link?: string) {
    const data = await this.prisma.notifikasi.create({
      data: { idUser, tipe, judul, pesan, link },
    });
    this.kirimPush([idUser], judul, pesan, link);
    return data;
  }

  async kirimAtauPerbarui(idUser: number, tipe: TipeNotifikasi, judul: string, pesan: string, link: string) {
    const ada = await this.prisma.notifikasi.findMany({
      where: { idUser, tipe, link, isRead: false },
      orderBy: { createdAt: 'desc' },
    });
    if (ada.length === 0) return this.kirim(idUser, tipe, judul, pesan, link);
    const [utama, ...kembar] = ada;
    if (kembar.length > 0) {
      await this.prisma.notifikasi.deleteMany({ where: { id: { in: kembar.map((n) => n.id) } } });
    }
    const data = await this.prisma.notifikasi.update({
      where: { id: utama.id },
      data: { judul, pesan, createdAt: new Date() },
    });
    this.kirimPush([idUser], judul, pesan, link);
    return data;
  }

  async kirimBanyak(
    idUserList: number[],
    tipe: TipeNotifikasi,
    judul: string,
    pesan: string,
    link?: string,
  ) {
    const unique = [...new Set(idUserList)];
    if (unique.length === 0) return Promise.resolve();
    const data = await this.prisma.notifikasi.createMany({
      data: unique.map((idUser) => ({ idUser, tipe, judul, pesan, link })),
    });
    this.kirimPush(unique, judul, pesan, link);
    return data;
  }

  async kirimKePermission(
    kode: string,
    area: Area | null | undefined,
    tipe: TipeNotifikasi,
    judul: string,
    pesan: string,
    link?: string,
    kecualiUserId?: number,
  ) {
    const punyaPermission = (scope: ScopeAkses[]) => ({
      role: {
        permissions: { some: { permission: { kode }, scope: { in: scope } } },
      },
    });

    const seluruhRw = !area || area === 'RW';
    const users = await this.prisma.user.findMany({
      where: {
        ...(kecualiUserId !== undefined && { id: { not: kecualiUserId } }),
        OR: seluruhRw
          ? [punyaPermission(['ALL', 'AREA', 'OWN'])]
          : [punyaPermission(['ALL']), { area, ...punyaPermission(['AREA', 'OWN']) }],
      },
      select: { id: true },
    });
    return this.kirimBanyak(users.map((u) => u.id), tipe, judul, pesan, link);
  }

  async kirimKePermissionAreaPersis(
    kode: string,
    area: Area,
    tipe: TipeNotifikasi,
    judul: string,
    pesan: string,
    link?: string,
    kecualiUserId?: number,
  ) {
    const punyaPermission = (scope: ScopeAkses[]) => ({
      role: {
        permissions: { some: { permission: { kode }, scope: { in: scope } } },
      },
    });
    const users = await this.prisma.user.findMany({
      where: {
        ...(kecualiUserId !== undefined && { id: { not: kecualiUserId } }),
        OR: [punyaPermission(['ALL']), { area, ...punyaPermission(['AREA', 'OWN']) }],
      },
      select: { id: true },
    });
    return this.kirimBanyak(users.map((u) => u.id), tipe, judul, pesan, link);
  }

  async findByUser(userId: number) {
    const [items, belumDibaca] = await Promise.all([
      this.prisma.notifikasi.findMany({
        where: { idUser: userId },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
      this.prisma.notifikasi.count({ where: { idUser: userId, isRead: false } }),
    ]);
    return { items, belumDibaca };
  }

  async markRead(id: number, userId: number) {
    const notif = await this.prisma.notifikasi.findUnique({ where: { id } });
    if (!notif) {
      return { id, dihapus: true };
    }
    if (notif.idUser !== userId) {
      throw new ForbiddenException('Anda tidak berhak mengubah notifikasi ini');
    }
    await this.prisma.notifikasi.delete({ where: { id } });
    return { id, dihapus: true };
  }

  async markAllRead(userId: number) {
    const { count } = await this.prisma.notifikasi.deleteMany({ where: { idUser: userId } });
    return { message: 'Semua notifikasi sudah dibaca dan dihapus', jumlah: count };
  }
}
