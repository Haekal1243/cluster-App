import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  OnApplicationBootstrap,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Area, Prisma, RT } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { FileService } from '../common/file/file.service';
import { CreatePengaduanDto } from './dto/create-pengaduan.dto';
import { RespondPengaduanDto } from './dto/respond-pengaduan.dto';
import { NotifikasiService } from '../notifikasi/notifikasi.service';
import { PermissionsService } from '../auth/permissions.service';
import { AccessContext, AuthUser } from '../auth/auth.types';
import { areaFilter, assertInArea, isRtArea } from '../common/scope.helper';
import { LEVEL_WARGA } from '../common/helpers';

const STATUS_LABELS: Record<string, string> = {
  DIPROSES: 'Diproses',
  SELESAI: 'Selesai',
  DITOLAK: 'Ditolak',
};

const SEMUA_RT: RT[] = ['RT_01', 'RT_02', 'RT_03', 'RT_04'];

const HARI_BATAS_TANGGAPAN = 7;

const PELAPOR_SELECT = { id: true, namaUser: true, username: true, area: true };

@Injectable()
export class PengaduanService implements OnApplicationBootstrap {
  private readonly logger = new Logger(PengaduanService.name);

  constructor(
    private prisma: PrismaService,
    private notifikasiService: NotifikasiService,
    private permissions: PermissionsService,
    private files: FileService,
  ) {}

  onApplicationBootstrap() {
    this.teruskanOtomatis().catch((err) =>
      this.logger.error('Gagal menjalankan auto-teruskan pengaduan saat start', err),
    );
  }

  private scopeWhere(ctx: AccessContext): Prisma.PengaduanWhereInput {
    if (ctx.scope === 'OWN') return { idUser: ctx.user.sub };
    const area = areaFilter(ctx);
    if (area === null) return {};
    if (area === 'RW') {
      return {
        OR: [{ tujuan: 'RW' }, { diteruskanAt: { not: null } }, { idUser: ctx.user.sub }],
      };
    }
    return { OR: [{ tujuan: area }, { idUser: ctx.user.sub }] };
  }

  async getTujuanPilihan(user: AuthUser): Promise<{ value: Area; label: string }[]> {
    const [scopeRw, scopeRt, roleInfo, rumahList] = await Promise.all([
      this.permissions.scopeOf(user.roleId, 'pengaduan.create_rw'),
      this.permissions.scopeOf(user.roleId, 'pengaduan.create_rt'),
      this.prisma.role.findUnique({ where: { id: user.roleId }, select: { level: true } }),
      this.prisma.rumah.findMany({
        where: { userId: user.sub, isDelete: false },
        select: { rt: true },
        distinct: ['rt'],
      }),
    ]);

    const isPengurus = (roleInfo?.level ?? LEVEL_WARGA) < LEVEL_WARGA;
    const rtDipunya = new Set(rumahList.map((r) => r.rt));
    if (rtDipunya.size === 0 && isRtArea(user.area)) rtDipunya.add(user.area);
    if (isPengurus && isRtArea(user.area)) rtDipunya.delete(user.area);

    const pilihan: { value: Area; label: string }[] = [];
    if (scopeRw) pilihan.push({ value: 'RW', label: 'RW' });
    if (scopeRt) {
      for (const rt of SEMUA_RT) {
        if (rtDipunya.has(rt)) pilihan.push({ value: rt, label: rt.replace('_', ' ') });
      }
    }
    return pilihan;
  }

  async create(user: AuthUser, dto: CreatePengaduanDto, file?: Express.Multer.File) {
    const pilihan = await this.getTujuanPilihan(user);
    if (!pilihan.some((p) => p.value === dto.tujuan)) {
      throw new ForbiddenException(
        'Tujuan pengaduan tidak valid untuk akun Anda. Muat ulang halaman dan coba lagi.',
      );
    }

    const fotoUrl = file ? await this.files.simpan(file, { publik: true }) : undefined;
    const data = await this.prisma.pengaduan.create({
      data: {
        idUser: user.sub,
        judul: dto.judul,
        kategori: dto.kategori,
        deskripsi: dto.deskripsi,
        fotoUrl,
        tujuan: dto.tujuan,
      },
    });

    await this.notifikasiService.kirimKePermissionAreaPersis(
      'pengaduan.respon',
      dto.tujuan,
      'PENGADUAN_BARU',
      'Pengaduan Baru',
      `Pengaduan baru: "${data.judul}" perlu ditinjau.`,
      '/dashboard/pengaduan',
      user.sub,
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
    } else if (userId !== ctx.user.sub) {
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

    if (existing.idUser === ctx.user.sub) {
      throw new ForbiddenException('Anda tidak bisa menanggapi pengaduan milik sendiri.');
    }
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

  @Cron(CronExpression.EVERY_DAY_AT_1AM)
  async teruskanOtomatis() {
    const batas = new Date();
    batas.setDate(batas.getDate() - HARI_BATAS_TANGGAPAN);

    const jatuhTempo = await this.prisma.pengaduan.findMany({
      where: {
        tujuan: { not: 'RW' },
        status: 'MENUNGGU',
        diteruskanAt: null,
        isDelete: false,
        createdAt: { lte: batas },
      },
      select: { id: true, judul: true, tujuan: true, idUser: true },
    });
    if (jatuhTempo.length === 0) return;

    const now = new Date();
    await this.prisma.pengaduan.updateMany({
      where: { id: { in: jatuhTempo.map((p) => p.id) } },
      data: { diteruskanAt: now },
    });

    for (const p of jatuhTempo) {
      await this.notifikasiService.kirimKePermissionAreaPersis(
        'pengaduan.respon',
        'RW',
        'PENGADUAN_DITERUSKAN',
        'Pengaduan Diteruskan ke RW',
        `Pengaduan "${p.judul}" (${p.tujuan.replace('_', ' ')}) belum ditanggapi 7 hari, diteruskan ke RW.`,
        '/dashboard/pengaduan',
      );
      await this.notifikasiService.kirimKePermissionAreaPersis(
        'pengaduan.respon',
        p.tujuan,
        'PENGADUAN_DITERUSKAN',
        'Pengaduan Belum Ditanggapi',
        `Pengaduan "${p.judul}" belum ditanggapi 7 hari dan sudah diteruskan ke pengurus RW.`,
        '/dashboard/pengaduan',
      );
      await this.notifikasiService.kirim(
        p.idUser,
        'PENGADUAN_DITERUSKAN',
        'Pengaduan Diteruskan',
        `Pengaduan "${p.judul}" kamu belum ditanggapi pengurus RT dalam 7 hari, sudah diteruskan ke pengurus RW.`,
        '/dashboard/pengaduan',
      );
    }

    this.logger.log(`Auto-teruskan: ${jatuhTempo.length} pengaduan diteruskan ke RW.`);
  }
}
