import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePengaduanDto } from './dto/create-pengaduan.dto';
import { RespondPengaduanDto } from './dto/respond-pengaduan.dto';
import { NotifikasiService } from '../notifikasi/notifikasi.service';
import { AccessContext } from '../auth/auth.types';
import { areaFilter, assertInArea } from '../common/scope.helper';

const STATUS_LABELS: Record<string, string> = {
  DIPROSES: 'Diproses',
  SELESAI: 'Selesai',
  DITOLAK: 'Ditolak',
};

const PELAPOR_SELECT = { id: true, namaUser: true, email: true, username: true, area: true };

@Injectable()
export class PengaduanService {
  constructor(
    private prisma: PrismaService,
    private notifikasiService: NotifikasiService,
  ) {}

  /** OWN = pengaduan sendiri, AREA = pelapor satu RT, ALL = seluruh RW. */
  private scopeWhere(ctx: AccessContext): Prisma.PengaduanWhereInput {
    if (ctx.scope === 'OWN') return { idUser: ctx.user.sub };
    const area = areaFilter(ctx);
    return area ? { pelapor: { area } } : {};
  }

  async create(ctx: AccessContext, dto: CreatePengaduanDto, file?: Express.Multer.File) {
    const data = await this.prisma.pengaduan.create({
      data: {
        idUser: ctx.user.sub,
        judul: dto.judul,
        kategori: dto.kategori,
        deskripsi: dto.deskripsi,
        fotoUrl: file?.filename,
      },
    });

    // Yang berhak menanggapi: pengurus RT pelapor + pengurus RW/admin (scope ALL)
    await this.notifikasiService.kirimKePermission(
      'pengaduan.respon',
      ctx.user.area,
      'PENGADUAN_BARU',
      'Pengaduan Baru',
      `Pengaduan baru: "${data.judul}" perlu ditinjau.`,
      '/dashboard/pengaduan',
      ctx.user.sub,
    );

    return { message: 'Pengaduan berhasil dikirim', data };
  }

  findAll(ctx: AccessContext) {
    return this.prisma.pengaduan.findMany({
      where: { AND: [{ isDelete: false }, this.scopeWhere(ctx)] },
      include: { pelapor: { select: PELAPOR_SELECT } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findByUser(ctx: AccessContext, userId: number) {
    if (ctx.scope === 'OWN') {
      if (userId !== ctx.user.sub) {
        throw new ForbiddenException('Anda tidak berhak melihat pengaduan warga lain');
      }
    } else {
      const target = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { area: true },
      });
      if (!target) throw new NotFoundException('Warga tidak ditemukan');
      assertInArea(ctx, target.area);
    }
    return this.prisma.pengaduan.findMany({
      where: { idUser: userId, isDelete: false },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(ctx: AccessContext, id: number) {
    const pengaduan = await this.prisma.pengaduan.findFirst({
      where: { AND: [{ id, isDelete: false }, this.scopeWhere(ctx)] },
      include: { pelapor: { select: PELAPOR_SELECT } },
    });
    if (!pengaduan) {
      throw new NotFoundException(`Pengaduan dengan ID ${id} tidak ditemukan`);
    }
    return pengaduan;
  }

  async respond(ctx: AccessContext, id: number, dto: RespondPengaduanDto) {
    const existing = await this.findOne(ctx, id);

    if (existing.status === 'SELESAI' || existing.status === 'DITOLAK') {
      throw new ForbiddenException(
        'Pengaduan yang sudah Selesai atau Ditolak tidak dapat ditanggapi lagi',
      );
    }

    const data = await this.prisma.pengaduan.update({
      where: { id },
      data: {
        status: dto.status,
        tanggapan: dto.tanggapan,
        tanggapanBy: ctx.user.nama,
        updatedAt: new Date(),
      },
    });

    await this.notifikasiService.kirim(
      existing.idUser,
      'PENGADUAN_DITANGGAPI',
      'Pengaduan Ditanggapi',
      `Pengaduan "${existing.judul}" kamu sudah ditanggapi: ${STATUS_LABELS[dto.status] || dto.status}.`,
      '/dashboard/pengaduan',
    );

    return { message: 'Tanggapan berhasil disimpan', data };
  }
}
