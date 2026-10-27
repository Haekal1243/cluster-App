import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotifikasiService } from '../notifikasi/notifikasi.service';
import { AuditService } from '../audit/audit.service';
import { AccessContext } from '../auth/auth.types';
import { visibilitasKelolaWhere, visibilitasWhere } from '../common/publikasi.helper';
import { BeriFeedbackDto, SembunyikanFeedbackDto } from './dto/beri-feedback.dto';

/** Masukan hanya bisa diberi/diubah sampai sekian hari setelah tanggal acara. */
const BATAS_HARI = 7;

const batasAwal = () => {
  const d = new Date();
  d.setDate(d.getDate() - BATAS_HARI);
  return d;
};

@Injectable()
export class KegiatanFeedbackService {
  constructor(
    private prisma: PrismaService,
    private notifikasiService: NotifikasiService,
    private audit: AuditService,
  ) {}

  /** Kegiatan yang boleh dipantau masukannya oleh user ini (area sendiri, atau semua untuk RW). */
  private kegiatanKelola(ctx: AccessContext): Prisma.KegiatanWhereInput {
    return { AND: [{ isDelete: false }, visibilitasKelolaWhere(ctx)] };
  }

  /** Kartu kegiatan yang sudah punya masukan, yang terbaru masuk di atas. */
  async rekap(ctx: AccessContext) {
    const grup = await this.prisma.kegiatanFeedback.groupBy({
      by: ['kegiatanId'],
      where: { kegiatan: this.kegiatanKelola(ctx) },
      _count: { _all: true },
      _avg: { rating: true },
      _max: { createdAt: true },
    });
    if (!grup.length) return [];

    const kegiatan = await this.prisma.kegiatan.findMany({
      where: { id: { in: grup.map((g) => g.kegiatanId) } },
      select: { id: true, judul: true, tanggalAcara: true, area: true, gambarUrl: true },
    });
    const byId = new Map(kegiatan.map((k) => [k.id, k]));

    return grup
      .map((g) => ({
        ...byId.get(g.kegiatanId)!,
        jumlah: g._count._all,
        rata: Math.round((g._avg.rating ?? 0) * 10) / 10,
        terakhir: g._max.createdAt,
      }))
      .sort((a, b) => +new Date(b.terakhir!) - +new Date(a.terakhir!));
  }

  /** Ringkasan (rata-rata, sebaran bintang) + daftar masukan satu kegiatan. Nama dibuang bila anonim. */
  async daftar(ctx: AccessContext, kegiatanId: number) {
    const kegiatan = await this.prisma.kegiatan.findFirst({
      where: { AND: [{ id: kegiatanId }, this.kegiatanKelola(ctx)] },
      select: { id: true, judul: true, tanggalAcara: true, area: true },
    });
    if (!kegiatan) throw new NotFoundException('Kegiatan tidak ditemukan');

    const rows = await this.prisma.kegiatanFeedback.findMany({
      where: { kegiatanId },
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            namaUser: true,
            rumah: { where: { isDelete: false }, select: { blokRumah: true, rt: true }, take: 1 },
          },
        },
      },
    });

    const sebaran: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let total = 0;
    for (const r of rows) {
      sebaran[r.rating] += 1;
      total += r.rating;
    }

    return {
      kegiatan,
      ringkasan: {
        jumlah: rows.length,
        rata: rows.length ? Math.round((total / rows.length) * 10) / 10 : 0,
        sebaran,
      },
      data: rows.map((r) => ({
        id: r.id,
        rating: r.rating,
        komentar: r.komentar,
        anonim: r.anonim,
        disembunyikan: r.disembunyikan,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
        // anonim: nama & alamat tidak ikut dikirim sama sekali
        nama: r.anonim ? null : r.user.namaUser,
        rumah: r.anonim ? null : (r.user.rumah[0] ?? null),
      })),
    };
  }

  /** Kegiatan yang baru selesai dan bisa diberi masukan oleh user ini, lengkap dengan masukan miliknya. */
  async bisaDiberi(ctx: AccessContext) {
    const rows = await this.prisma.kegiatan.findMany({
      where: {
        AND: [
          { isDelete: false, status: 'active', tanggalAcara: { lte: new Date(), gte: batasAwal() } },
          visibilitasWhere(ctx),
        ],
      },
      orderBy: { tanggalAcara: 'desc' },
      select: {
        id: true,
        judul: true,
        tanggalAcara: true,
        area: true,
        gambarUrl: true,
        feedback: {
          where: { userId: ctx.user.sub },
          select: { rating: true, komentar: true, anonim: true },
          take: 1,
        },
      },
    });
    return rows.map(({ feedback, ...k }) => ({ ...k, feedbackSaya: feedback[0] ?? null }));
  }

  /** Beri atau ubah masukan milik sendiri (satu per kegiatan). */
  async beri(ctx: AccessContext, kegiatanId: number, dto: BeriFeedbackDto) {
    const kegiatan = await this.prisma.kegiatan.findFirst({
      where: { AND: [{ id: kegiatanId, isDelete: false }, visibilitasWhere(ctx)] },
      select: { id: true, judul: true, area: true, tanggalAcara: true },
    });
    if (!kegiatan) throw new NotFoundException('Kegiatan tidak ditemukan');
    if (kegiatan.tanggalAcara > new Date()) {
      throw new BadRequestException('Masukan baru bisa diberikan setelah kegiatan berlangsung');
    }
    if (kegiatan.tanggalAcara < batasAwal()) {
      throw new BadRequestException(`Masukan hanya bisa diberikan sampai ${BATAS_HARI} hari setelah kegiatan`);
    }

    const komentar = dto.komentar?.trim() || null;
    const anonim = dto.anonim ?? false;
    const kunci = { kegiatanId_userId: { kegiatanId, userId: ctx.user.sub } };
    const sudah = await this.prisma.kegiatanFeedback.findUnique({ where: kunci, select: { id: true } });

    await this.prisma.kegiatanFeedback.upsert({
      where: kunci,
      create: { kegiatanId, userId: ctx.user.sub, rating: dto.rating, komentar, anonim },
      update: { rating: dto.rating, komentar, anonim },
    });

    // Pengurus cukup diberi tahu sekali per warga; mengubah masukan tidak mengirim notifikasi lagi.
    if (!sudah) {
      await this.notifikasiService.kirimKePermission(
        'kegiatan.feedback_lihat',
        kegiatan.area,
        'FEEDBACK_KEGIATAN',
        'Masukan Kegiatan Baru',
        `${kegiatan.judul} — ${dto.rating}★`,
        '/dashboard/kegiatan',
        ctx.user.sub,
      );
    }

    return { message: sudah ? 'Masukan diperbarui' : 'Terima kasih atas masukannya' };
  }

  /** Sembunyikan / tampilkan masukan (moderasi komentar). Datanya tetap ada untuk pengurus. */
  async sembunyikan(ctx: AccessContext, id: number, dto: SembunyikanFeedbackDto) {
    const fb = await this.prisma.kegiatanFeedback.findUnique({
      where: { id },
      include: { kegiatan: { select: { area: true, isDelete: true } } },
    });
    if (!fb || fb.kegiatan.isDelete) throw new NotFoundException('Masukan tidak ditemukan');
    if (ctx.scope !== 'ALL' && fb.kegiatan.area !== ctx.user.area) {
      throw new ForbiddenException('Masukan ini di luar wilayah Anda');
    }

    await this.prisma.kegiatanFeedback.update({ where: { id }, data: { disembunyikan: dto.disembunyikan } });
    await this.audit.catat(ctx.user.sub, dto.disembunyikan ? 'kegiatan.feedback_sembunyi' : 'kegiatan.feedback_tampil', {
      target: 'KegiatanFeedback',
      targetId: id,
    });
    return { message: dto.disembunyikan ? 'Masukan disembunyikan' : 'Masukan ditampilkan kembali' };
  }
}
