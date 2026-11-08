import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Area, Prisma } from '@prisma/client';
import { TtlCache } from '../common/ttl-cache';
import { PrismaService } from '../prisma/prisma.service';
import { CreateKegiatanDto } from './dto/create-kegiatan.dto';
import { UpdateKegiatanDto } from './dto/update-kegiatan.dto';
import { UpdateStatusKegiatanDto } from './dto/update-status-kegiatan.dto';
import { KeputusanPengajuanDto } from '../common/dto/pengajuan.dto';
import { NotifikasiService } from '../notifikasi/notifikasi.service';
import { PermissionsService } from '../auth/permissions.service';
import { AuditService } from '../audit/audit.service';
import { FileService } from '../common/file/file.service';
import { AccessContext } from '../auth/auth.types';
import { areaFilter, assertInArea } from '../common/scope.helper';
import {
  belumLewatBatasTampil,
  tampilKeSemua,
  tampilSampaiDari,
  assertBolehUbahKonten,
  visibilitasKelolaWhere,
  visibilitasWhere,
} from '../common/publikasi.helper';

const batasAktif = () => {
  const d = new Date();
  d.setDate(d.getDate() - 7);
  return d;
};

const RINGKAS = {
  id: true,
  judul: true,
  deskripsi: true,
  gambarUrl: true,
  tanggalAcara: true,
  area: true,
} satisfies Prisma.KegiatanSelect;

@Injectable()
export class KegiatanService {
  constructor(
    private prisma: PrismaService,
    private notifikasiService: NotifikasiService,
    private permissions: PermissionsService,
    private audit: AuditService,
    private files: FileService,
  ) {}

  private async bolehApprove(ctx: AccessContext) {
    return (await this.permissions.scopeOf(ctx.user.roleId, 'kegiatan.approve')) !== null;
  }


  async create(ctx: AccessContext, dto: CreateKegiatanDto, file?: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Gambar kegiatan wajib diunggah');
    }

    const area: Area = areaFilter(ctx) ?? dto.area ?? ctx.user.area ?? 'RW';
    const approver = await this.bolehApprove(ctx);

    const gambarUrl = await this.files.simpan(file, { publik: true });
    const data = await this.prisma.kegiatan.create({
      data: {
        judul: dto.judul,
        deskripsi: dto.deskripsi,
        tanggalAcara: new Date(dto.tanggalAcara),
        status: dto.status,
        gambarUrl,
        area,
        createBy: ctx.user.nama,
        ...(approver && {
          tampilDiLanding: dto.tampilDiLanding ?? false,
          tampilSampai: tampilSampaiDari(dto.durasiHari),
        }),
      },
    });

    if (data.status === 'active') {
      await this.notifikasiService.kirimKePermission(
        'kegiatan.read',
        data.area,
        'KEGIATAN_BARU',
        'Kegiatan Baru',
        data.judul,
        '/dashboard',
        ctx.user.sub,
      );
    }

    return { message: 'Kegiatan berhasil dibuat', data };
  }

  private async sembunyikanAlasan<T extends { alasanTolak?: string | null }>(ctx: AccessContext, rows: T[]): Promise<T[]> {
    if ((await this.permissions.scopeOf(ctx.user.roleId, 'kegiatan.update')) !== null) return rows;
    return rows.map((r) => ({ ...r, alasanTolak: null }));
  }

  async findAll(ctx: AccessContext, params: { pengajuan?: string; area?: string } = {}) {
    const and: Prisma.KegiatanWhereInput[] = [{ isDelete: false }, visibilitasKelolaWhere(ctx)];
    if (params.pengajuan) and.push({ statusPengajuan: params.pengajuan as any });
    if (params.area && ctx.scope === 'ALL') and.push({ area: params.area as Area });
    const rows = await this.prisma.kegiatan.findMany({
      where: { AND: and },
      orderBy: { tanggalAcara: 'desc' },
    });
    const batas = batasAktif();
    const hasil = rows.map((k) => (k.tanggalAcara < batas ? { ...k, status: 'unactived' as const } : k));
    return this.sembunyikanAlasan(ctx, hasil);
  }

  async feed(ctx: AccessContext) {
    const rows = await this.prisma.kegiatan.findMany({
      where: {
        AND: [
          { isDelete: false, status: 'active', tanggalAcara: { gte: batasAktif() } },
          visibilitasWhere(ctx),
          belumLewatBatasTampil(),
        ],
      },
      orderBy: { tanggalAcara: 'desc' },
      take: 20,
    });
    return this.sembunyikanAlasan(ctx, rows);
  }

  private readonly cacheActive = new TtlCache<unknown[]>(15_000);

  findActive(scope?: 'aktif' | 'arsip') {
    return this.cacheActive.get(scope ?? 'aktif', () => this.queryActive(scope));
  }

  private queryActive(scope?: 'aktif' | 'arsip') {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (scope === 'arsip') {
      return this.prisma.kegiatan.findMany({
        where: { isDelete: false, ...tampilKeSemua, tanggalAcara: { lt: today } },
        orderBy: { tanggalAcara: 'desc' },
        take: 5,
        select: RINGKAS,
      });
    }
    return this.prisma.kegiatan.findMany({
      where: { isDelete: false, status: 'active', ...tampilKeSemua, tanggalAcara: { gte: today } },
      orderBy: { tanggalAcara: 'asc' },
      take: 5,
      select: RINGKAS,
    });
  }

  async portofolio(tahunDipilih?: number) {
    const dasar: Prisma.KegiatanWhereInput = {
      isDelete: false,
      status: 'active',
      tampilDiLanding: true,
      ...tampilKeSemua,
    };

    const semuaTanggal = await this.prisma.kegiatan.findMany({
      where: dasar,
      select: { tanggalAcara: true },
    });
    const tahunTersedia = [...new Set(semuaTanggal.map((r) => r.tanggalAcara.getFullYear()))].sort((a, b) => b - a);
    const tahunFilter = tahunDipilih && tahunTersedia.includes(tahunDipilih) ? tahunDipilih : undefined;

    const rows = await this.prisma.kegiatan.findMany({
      where: tahunFilter
        ? { ...dasar, tanggalAcara: { gte: new Date(tahunFilter, 0, 1), lt: new Date(tahunFilter + 1, 0, 1) } }
        : dasar,
      orderBy: { tanggalAcara: 'asc' },
      select: {
        ...RINGKAS,
        feedback: {
          where: { disembunyikan: false },
          orderBy: { createdAt: 'desc' },
          select: { rating: true, komentar: true, createdAt: true },
        },
      },
    });

    const perTahun = new Map<number, unknown[]>();
    for (const { feedback, ...k } of rows) {
      const jumlah = feedback.length;
      const masukan = {
        jumlah,
        rata: jumlah ? Math.round((feedback.reduce((t, f) => t + f.rating, 0) / jumlah) * 10) / 10 : 0,
        komentar: feedback.filter((f) => f.komentar?.trim()).slice(0, 50),
      };
      const tahun = k.tanggalAcara.getFullYear();
      perTahun.set(tahun, [...(perTahun.get(tahun) ?? []), { ...k, masukan }]);
    }
    return {
      total: rows.length,
      tahunTersedia,
      tahunDipilih: tahunFilter ?? null,
      tahun: [...perTahun.entries()]
        .sort((a, b) => a[0] - b[0])
        .map(([tahun, kegiatan]) => ({ tahun, kegiatan })),
    };
  }

  async findOne(ctx: AccessContext, id: number) {
    const kegiatan = await this.prisma.kegiatan.findFirst({
      where: { AND: [{ id, isDelete: false }, visibilitasWhere(ctx)] },
    });
    if (!kegiatan) {
      throw new NotFoundException(`Kegiatan dengan ID ${id} tidak ditemukan`);
    }
    return (await this.sembunyikanAlasan(ctx, [kegiatan]))[0];
  }

  private async findForWrite(ctx: AccessContext, id: number) {
    const kegiatan = await this.prisma.kegiatan.findFirst({ where: { id, isDelete: false } });
    if (!kegiatan) {
      throw new NotFoundException(`Kegiatan dengan ID ${id} tidak ditemukan`);
    }
    assertInArea(ctx, kegiatan.area);
    assertBolehUbahKonten(ctx, kegiatan);
    return kegiatan;
  }

  async update(ctx: AccessContext, id: number, dto: UpdateKegiatanDto, file?: Express.Multer.File) {
    const existing = await this.findForWrite(ctx, id);
    const approver = await this.bolehApprove(ctx);

    const gambarBaru = file ? await this.files.simpan(file, { publik: true }) : undefined;

    const data = await this.prisma.kegiatan.update({
      where: { id },
      data: {
        judul: dto.judul,
        deskripsi: dto.deskripsi,
        tanggalAcara: dto.tanggalAcara ? new Date(dto.tanggalAcara) : undefined,
        status: dto.status,
        gambarUrl: gambarBaru,
        updateBy: ctx.user.nama,
        updatedAt: new Date(),
        ...(approver && {
          tampilDiLanding: dto.tampilDiLanding,
          tampilSampai: tampilSampaiDari(dto.durasiHari),
        }),
        ...(!approver &&
          (existing.statusPengajuan === 'DIAJUKAN' || existing.statusPengajuan === 'DISETUJUI') && {
            statusPengajuan: 'TIDAK' as const,
            alasanTolak: null,
          }),
      },
    });

    if (gambarBaru) await this.files.hapus(existing.gambarUrl);

    return { message: 'Kegiatan berhasil diperbarui', data };
  }

  async updateStatus(ctx: AccessContext, id: number, dto: UpdateStatusKegiatanDto) {
    await this.findForWrite(ctx, id);

    const data = await this.prisma.kegiatan.update({
      where: { id },
      data: { status: dto.status, updateBy: ctx.user.nama, updatedAt: new Date() },
    });

    return { message: 'Status kegiatan berhasil diperbarui', data };
  }

  async remove(ctx: AccessContext, id: number) {
    await this.findForWrite(ctx, id);

    await this.prisma.kegiatan.update({
      where: { id },
      data: { isDelete: true, updateBy: ctx.user.nama, updatedAt: new Date() },
    });

    return { message: 'Kegiatan berhasil dihapus' };
  }


  async ajukan(ctx: AccessContext, id: number) {
    const kegiatan = await this.findForWrite(ctx, id);
    if (kegiatan.area === 'RW') {
      throw new BadRequestException('Kegiatan level RW sudah tampil ke seluruh warga.');
    }
    if (kegiatan.statusPengajuan === 'DIAJUKAN' || kegiatan.statusPengajuan === 'DISETUJUI') {
      throw new BadRequestException('Kegiatan ini sudah diajukan.');
    }

    const data = await this.prisma.kegiatan.update({
      where: { id },
      data: {
        statusPengajuan: 'DIAJUKAN',
        alasanTolak: null,
        updateBy: ctx.user.nama,
        updatedAt: new Date(),
      },
    });

    await this.notifikasiService.kirimKePermission(
      'kegiatan.approve',
      'RW',
      'PENGAJUAN_MASUK',
      'Pengajuan Kegiatan',
      `${kegiatan.area.replace('_', ' ')} mengajukan kegiatan "${kegiatan.judul}" untuk ditampilkan ke seluruh warga.`,
      '/dashboard/kegiatan',
      ctx.user.sub,
    );

    return { message: 'Kegiatan diajukan ke RW untuk disetujui.', data };
  }

  async putuskanPengajuan(ctx: AccessContext, id: number, dto: KeputusanPengajuanDto) {
    const kegiatan = await this.prisma.kegiatan.findFirst({ where: { id, isDelete: false } });
    if (!kegiatan) throw new NotFoundException(`Kegiatan dengan ID ${id} tidak ditemukan`);
    assertInArea(ctx, kegiatan.area);
    if (kegiatan.statusPengajuan !== 'DIAJUKAN') {
      throw new BadRequestException('Kegiatan ini tidak sedang diajukan.');
    }

    if (dto.action === 'TOLAK') {
      if (!dto.alasan?.trim()) throw new BadRequestException('Alasan penolakan wajib diisi.');
      const data = await this.prisma.kegiatan.update({
        where: { id },
        data: { statusPengajuan: 'DITOLAK', alasanTolak: dto.alasan, updateBy: ctx.user.nama, updatedAt: new Date() },
      });
      await this.audit.catat(ctx.user.sub, 'kegiatan.tolak', {
        target: 'Kegiatan',
        targetId: id,
        keterangan: dto.alasan,
      });
      await this.notifikasiService.kirimKePermission(
        'kegiatan.ajukan',
        kegiatan.area,
        'PENGAJUAN_DITOLAK',
        'Pengajuan Kegiatan Ditolak',
        `Pengajuan kegiatan "${kegiatan.judul}" ditolak RW. Alasan: ${dto.alasan}`,
        '/dashboard/kegiatan',
        ctx.user.sub,
      );
      return { message: 'Pengajuan ditolak.', data };
    }

    const data = await this.prisma.kegiatan.update({
      where: { id },
      data: {
        statusPengajuan: 'DISETUJUI',
        alasanTolak: null,
        tampilSampai: tampilSampaiDari(dto.durasiHari),
        updateBy: ctx.user.nama,
        updatedAt: new Date(),
      },
    });
    await this.audit.catat(ctx.user.sub, 'kegiatan.setujui', { target: 'Kegiatan', targetId: id });
    await this.notifikasiService.kirimKePermission(
      'kegiatan.ajukan',
      kegiatan.area,
      'PENGAJUAN_DISETUJUI',
      'Pengajuan Kegiatan Disetujui',
      `Kegiatan "${kegiatan.judul}" disetujui RW dan kini tampil ke seluruh warga.`,
      '/dashboard/kegiatan',
      ctx.user.sub,
    );
    if (kegiatan.status === 'active') {
      await this.notifikasiService.kirimKePermission(
        'kegiatan.read',
        'RW',
        'KEGIATAN_BARU',
        'Kegiatan Baru',
        kegiatan.judul,
        '/dashboard',
        ctx.user.sub,
      );
    }
    return { message: 'Pengajuan disetujui. Kegiatan tampil ke seluruh warga.', data };
  }
}
