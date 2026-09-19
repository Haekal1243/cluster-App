import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, RT, StatusPembayaran, StatusRumah } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { NotifikasiService } from '../notifikasi/notifikasi.service';
import { AuditService } from '../audit/audit.service';
import { SALT_ROUNDS } from '../auth/auth.service';
import { AccessContext } from '../auth/auth.types';
import { resolvePeriode } from '../common/periode.helper';
import { areaFilter, assertInArea, rtFilter, wargaBacaWhere } from '../common/scope.helper';
import { generatePassword, LEVEL_WARGA, totalTagihan, withTotal } from '../common/helpers';
import { CreateWargaDto } from './dto/create-warga.dto';
import { UpdateWargaDto } from './dto/update-warga.dto';
import { CreateRumahDto } from './dto/create-rumah.dto';
import { UpdateRumahDto } from './dto/update-rumah.dto';

export interface RingkasanRumah {
  id: number;
  blokRumah: string;
  rt: RT;
  nominal: number;
  status: StatusPembayaran;
}

export interface RingkasanPeriode {
  bulan: string;
  tahun: string;
  label: string;
  totalNominal: number;
  totalTagihan: number;
  lunas: number;
  belumLunas: number;
  menunggu: number;
  rumah: RingkasanRumah[];
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

const RUMAH_SELECT = {
  id: true,
  rt: true,
  blokRumah: true,
  status: true,
  userId: true,
} satisfies Prisma.RumahSelect;

// Password tidak pernah ikut keluar dari service ini.
const WARGA_SELECT = {
  id: true,
  namaUser: true,
  username: true,
  email: true,
  noTelp: true,
  area: true,
  wajibGantiPassword: true,
  createAt: true,
  role: { select: { kode: true, nama: true, level: true } },
  rumah: {
    where: { isDelete: false },
    orderBy: [{ rt: 'asc' }, { blokRumah: 'asc' }],
    select: RUMAH_SELECT,
  },
} satisfies Prisma.UserSelect;

const PENGHUNI_SELECT = {
  id: true,
  namaUser: true,
  username: true,
  email: true,
  noTelp: true,
  area: true,
  _count: { select: { rumah: { where: { isDelete: false } } } },
} satisfies Prisma.UserSelect;

@Injectable()
export class WargaService {
  constructor(
    private prisma: PrismaService,
    private notifikasiService: NotifikasiService,
    private audit: AuditService,
  ) {}

  // ================================================================
  // PORTAL WARGA — tagihan & pembayaran milik sendiri
  // ================================================================

  /** OWN: hanya diri sendiri. AREA: warga di area-nya. ALL: siapa pun. */
  private async assertBolehLihatUser(ctx: AccessContext, targetUserId: number) {
    if (ctx.scope === 'ALL') return;
    if (ctx.scope === 'OWN') {
      if (targetUserId !== ctx.user.sub) {
        throw new ForbiddenException('Anda hanya dapat melihat data milik sendiri.');
      }
      return;
    }
    const target = await this.prisma.user.findUnique({
      where: { id: targetUserId },
      select: { area: true },
    });
    if (!target) throw new NotFoundException('Warga tidak ditemukan');
    assertInArea(ctx, target.area);
  }

  async getRumahByUser(ctx: AccessContext, userId: number) {
    await this.assertBolehLihatUser(ctx, userId);
    return this.prisma.rumah.findMany({
      where: { userId, isDelete: false },
      orderBy: [{ rt: 'asc' }, { blokRumah: 'asc' }],
    });
  }

  /** Semua tagihan IPL untuk 1 rumah, diurutkan terbaru di atas */
  async getTagihanByRumah(ctx: AccessContext, rumahId: number) {
    const rumah = await this.prisma.rumah.findFirst({
      where: { id: rumahId, isDelete: false },
    });
    if (!rumah) throw new NotFoundException(`Rumah dengan ID ${rumahId} tidak ditemukan`);

    if (ctx.scope === 'OWN') {
      if (rumah.userId !== ctx.user.sub) {
        throw new ForbiddenException('Rumah ini bukan milik Anda.');
      }
    } else {
      assertInArea(ctx, rumah.rt);
    }

    const tagihan = await this.prisma.ipl.findMany({
      where: { idRumah: rumahId },
      include: {
        pembayaran: {
          orderBy: { tanggalBayar: 'desc' },
          take: 1,
          select: { buktiTransaksi: true, tanggalBayar: true, tanggalKonfirmasi: true },
        },
      },
      orderBy: [{ tahunPeriode: 'desc' }, { bulanPeriode: 'desc' }],
    });

    return { rumah, tagihan: tagihan.map(withTotal) };
  }

  /** Tagihan IPL gabungan semua rumah milik user.
   * Filter: bulan+tahun tunggal (legacy) atau range dari/sampai YYYY-MM (maks 12 bln),
   * plus status & search — mirror pola IplService.findAll. */
  async getTagihanByUser(
    ctx: AccessContext,
    userId: number,
    opts: {
      bulan?: string;
      tahun?: string;
      dari?: string;
      sampai?: string;
      status?: string;
      search?: string;
    },
  ) {
    await this.assertBolehLihatUser(ctx, userId);
    const { bulan, tahun: th, dari, sampai, status, search } = opts;

    const rumah = await this.prisma.rumah.findMany({
      where: { userId, isDelete: false },
      orderBy: [{ rt: 'asc' }, { blokRumah: 'asc' }],
    });

    if (rumah.length === 0) {
      return { rumah: [], tagihan: [], summaryByPeriode: {}, totalSummary: null };
    }

    const where: Prisma.IplWhereInput = { idRumah: { in: rumah.map((r) => r.id) } };
    const and: Prisma.IplWhereInput[] = [];
    const range = resolvePeriode(dari, sampai);
    if (range) {
      and.push({ OR: range.periodeOr });
    } else {
      if (bulan) and.push({ bulanPeriode: bulan });
      if (th) and.push({ tahunPeriode: th });
    }
    if (status && status !== 'SEMUA') and.push({ statusPembayaran: status as StatusPembayaran });
    if (search) {
      const q = search.trim();
      if (q) {
        const num = Number(q.replace(/[^0-9]/g, ''));
        const or: Prisma.IplWhereInput[] = [
          { bulanPeriode: { contains: q } },
          { tahunPeriode: { contains: q } },
          { rumah: { blokRumah: { contains: q } } },
        ];
        if (num) or.push({ nominalIpl: num }, { nominalKas: num });
        and.push({ OR: or });
      }
    }
    if (and.length > 0) where.AND = and;

    const rows = await this.prisma.ipl.findMany({
      where,
      include: {
        rumah: { select: { id: true, blokRumah: true, rt: true } },
        pembayaran: {
          orderBy: { tanggalBayar: 'desc' },
          take: 1,
          select: { buktiTransaksi: true, tanggalBayar: true, tanggalKonfirmasi: true, nominal: true },
        },
      },
      orderBy: [
        { tahunPeriode: 'desc' },
        { bulanPeriode: 'desc' },
        { rumah: { rt: 'asc' } },
        { rumah: { blokRumah: 'asc' } },
      ],
    });
    const tagihan = rows.map(withTotal);

    const summaryByPeriode: Record<string, RingkasanPeriode> = {};
    for (const t of tagihan) {
      const key = `${t.bulanPeriode}/${t.tahunPeriode}`;
      if (!summaryByPeriode[key]) {
        const m = parseInt(t.bulanPeriode, 10);
        summaryByPeriode[key] = {
          bulan: t.bulanPeriode,
          tahun: t.tahunPeriode,
          label: `${MONTHS[m - 1] || t.bulanPeriode} ${t.tahunPeriode}`,
          totalNominal: 0,
          totalTagihan: 0,
          lunas: 0,
          belumLunas: 0,
          menunggu: 0,
          rumah: [],
        };
      }
      const s = summaryByPeriode[key];
      s.totalNominal += t.nominal;
      s.totalTagihan += 1;
      if (t.statusPembayaran === 'LUNAS') s.lunas += 1;
      else if (t.statusPembayaran === 'BELUM_LUNAS') s.belumLunas += 1;
      else if (t.statusPembayaran === 'MENUNGGU_KONFIRMASI') s.menunggu += 1;
      s.rumah.push({
        id: t.rumah.id,
        blokRumah: t.rumah.blokRumah,
        rt: t.rumah.rt,
        nominal: t.nominal,
        status: t.statusPembayaran,
      });
    }

    const totalSummary = {
      totalRumah: rumah.length,
      totalTagihan: tagihan.length,
      totalNominal: tagihan.reduce((sum, t) => sum + t.nominal, 0),
      totalLunas: tagihan.filter((t) => t.statusPembayaran === 'LUNAS').length,
      totalBelumLunas: tagihan.filter((t) => t.statusPembayaran === 'BELUM_LUNAS').length,
      totalMenunggu: tagihan.filter((t) => t.statusPembayaran === 'MENUNGGU_KONFIRMASI').length,
    };

    return { rumah, tagihan, summaryByPeriode, totalSummary };
  }

  /** Warga mengirim bukti pembayaran untuk tagihan rumahnya sendiri. */
  async uploadBuktiPembayaran(
    ctx: AccessContext,
    data: { idIpl: number; nominal?: number; buktiTransaksi: string },
  ) {
    if (!data.buktiTransaksi) throw new BadRequestException('Bukti pembayaran wajib diunggah.');

    const ipl = await this.prisma.ipl.findUnique({
      where: { id: data.idIpl },
      include: { rumah: true },
    });
    if (!ipl) throw new NotFoundException('Tagihan tidak ditemukan');

    if (ctx.scope === 'OWN') {
      if (ipl.rumah.userId !== ctx.user.sub) {
        throw new ForbiddenException('Tagihan ini bukan milik Anda.');
      }
    } else {
      assertInArea(ctx, ipl.rumah.rt);
    }
    if (ipl.statusPembayaran === 'LUNAS') {
      throw new BadRequestException('Tagihan ini sudah lunas.');
    }
    if (ipl.statusPembayaran === 'MENUNGGU_KONFIRMASI') {
      throw new BadRequestException('Bukti pembayaran untuk tagihan ini sedang menunggu konfirmasi.');
    }

    const pembayaran = await this.prisma.$transaction(async (tx) => {
      const p = await tx.pembayaranIpl.create({
        data: {
          idUser: ctx.user.sub,
          idIpl: data.idIpl,
          nominal: data.nominal && data.nominal > 0 ? data.nominal : totalTagihan(ipl),
          buktiTransaksi: data.buktiTransaksi,
        },
      });
      await tx.ipl.update({
        where: { id: data.idIpl },
        data: { statusPembayaran: 'MENUNGGU_KONFIRMASI' },
      });
      return p;
    });

    // Bendahara RT di RT rumah ini (dan pemegang ALL seperti admin)
    await this.notifikasiService.kirimKePermission(
      'ipl.konfirmasi',
      ipl.rumah.rt,
      'PEMBAYARAN_MASUK',
      'Bukti Pembayaran Baru',
      `Warga blok ${ipl.rumah.blokRumah} mengirim bukti pembayaran IPL, menunggu konfirmasi.`,
      '/dashboard/iuran',
      ctx.user.sub,
    );

    return { message: 'Bukti pembayaran berhasil dikirim. Menunggu konfirmasi.', data: pembayaran };
  }

  // ================================================================
  // USER / WARGA CRUD — dikerjakan pengurus RT untuk warga RT-nya
  // ================================================================

  /**
   * Baca: semua penghuni di wilayahnya (termasuk pengurus yang tinggal di situ).
   * Tulis: hanya warga biasa (level warga) di areanya. Pengurus tidak boleh diubah, dihapus,
   * atau di-reset passwordnya oleh pengurus RT; jabatan mereka diatur admin.
   */
  private async findWargaScoped(ctx: AccessContext, id: number, tulis = false) {
    const area = areaFilter(ctx);
    const warga = await this.prisma.user.findFirst({
      where: tulis
        ? { id, role: { level: LEVEL_WARGA }, ...(area && { area }) }
        : { AND: [{ id }, wargaBacaWhere(area)] },
      select: WARGA_SELECT,
    });
    if (!warga) throw new NotFoundException(`Warga dengan ID ${id} tidak ditemukan`);
    return warga;
  }

  private handleUniqueError(error: any): never {
    if (error?.code === 'P2002') {
      const target = String(error.meta?.target ?? '');
      if (target.includes('email')) {
        throw new ConflictException('Email ini sudah terdaftar. Gunakan email lain atau kosongkan.');
      }
      throw new ConflictException('Nama pengguna / no HP ini sudah terdaftar. Gunakan yang lain.');
    }
    throw error;
  }

  async create(ctx: AccessContext, dto: CreateWargaDto) {
    assertInArea(ctx, dto.rt);

    const roleWarga = await this.prisma.role.findFirst({
      where: { level: LEVEL_WARGA, isSystem: true },
    });
    if (!roleWarga) {
      throw new InternalServerErrorException('Peran warga belum tersedia. Jalankan seed database.');
    }

    const username = (dto.username ?? dto.no_hp).trim();
    const passwordAwal = dto.password ?? generatePassword();
    const password = await bcrypt.hash(passwordAwal, SALT_ROUNDS);
    const status = dto.statusRumah ?? StatusRumah.DIHUNI_TETAP;
    const actor = ctx.user.nama;

    try {
      const user = await this.prisma.$transaction(async (tx) => {
        const rumah = await tx.rumah.findUnique({
          where: { rt_blokRumah: { rt: dto.rt, blokRumah: dto.blokRumah } },
        });
        if (rumah && !rumah.isDelete && rumah.userId) {
          throw new ConflictException(`Blok ${dto.blokRumah} sudah dihuni warga lain.`);
        }

        const created = await tx.user.create({
          data: {
            namaUser: dto.nama.trim(),
            username,
            email: dto.email ?? null,
            noTelp: dto.no_hp,
            password,
            roleId: roleWarga.id,
            area: dto.rt,
            wajibGantiPassword: true,
          },
          select: { id: true },
        });

        if (rumah) {
          await tx.rumah.update({
            where: { id: rumah.id },
            data: { userId: created.id, status, isDelete: false, updateBy: actor, updateDate: new Date() },
          });
        } else {
          await tx.rumah.create({
            data: { rt: dto.rt, blokRumah: dto.blokRumah, userId: created.id, status, createBy: actor },
          });
        }
        return created;
      });

      return {
        message: 'Akun warga dan data rumah berhasil dibuat!',
        data: await this.findWargaScoped(ctx, user.id),
        // Hanya dikirim bila digenerate; pengurus wajib menyampaikannya ke warga.
        ...(dto.password ? {} : { passwordAwal }),
      };
    } catch (error) {
      this.handleUniqueError(error);
    }
  }

  async findAll(ctx: AccessContext, params: { search?: string; rt?: string } = {}) {
    const area = areaFilter(ctx);
    const and: Prisma.UserWhereInput[] = [
      wargaBacaWhere(area ?? (params.rt ? (params.rt as RT) : null)),
    ];
    if (params.search?.trim()) {
      const q = params.search.trim();
      and.push({
        OR: [
          { namaUser: { contains: q } },
          { username: { contains: q } },
          { noTelp: { contains: q } },
          { rumah: { some: { blokRumah: { contains: q }, isDelete: false } } },
        ],
      });
    }
    return this.prisma.user.findMany({
      where: { AND: and },
      select: WARGA_SELECT,
      orderBy: [{ area: 'asc' }, { namaUser: 'asc' }],
    });
  }

  /** Dropdown di form Tambah / Edit Rumah */
  async findAllUsers(ctx: AccessContext) {
    const area = areaFilter(ctx);
    return this.prisma.user.findMany({
      where: wargaBacaWhere(area),
      select: PENGHUNI_SELECT,
      orderBy: { namaUser: 'asc' },
    });
  }

  findOne(ctx: AccessContext, id: number) {
    return this.findWargaScoped(ctx, id);
  }

  async update(ctx: AccessContext, id: number, dto: UpdateWargaDto) {
    await this.findWargaScoped(ctx, id, true);

    try {
      await this.prisma.user.update({
        where: { id },
        data: {
          ...(dto.nama !== undefined && { namaUser: dto.nama.trim() }),
          ...(dto.no_hp !== undefined && { noTelp: dto.no_hp }),
          ...(dto.username !== undefined && { username: dto.username.trim() }),
          ...(dto.email !== undefined && { email: dto.email }),
          ...(dto.password && {
            password: await bcrypt.hash(dto.password, SALT_ROUNDS),
            wajibGantiPassword: true,
          }),
        },
      });
    } catch (error) {
      this.handleUniqueError(error);
    }
    return this.findWargaScoped(ctx, id);
  }

  async remove(ctx: AccessContext, id: number) {
    await this.findWargaScoped(ctx, id, true);

    const [pembayaran, pengaduan] = await Promise.all([
      this.prisma.pembayaranIpl.count({ where: { idUser: id } }),
      this.prisma.pengaduan.count({ where: { idUser: id } }),
    ]);
    if (pembayaran > 0 || pengaduan > 0) {
      throw new BadRequestException(
        'Warga ini punya riwayat pembayaran/pengaduan sehingga tidak bisa dihapus. Kosongkan rumahnya bila sudah pindah.',
      );
    }

    await this.prisma.$transaction([
      this.prisma.rumah.updateMany({
        where: { userId: id },
        data: { userId: null, status: 'KOSONG', updateBy: ctx.user.nama, updateDate: new Date() },
      }),
      this.prisma.notifikasi.deleteMany({ where: { idUser: id } }),
      this.prisma.user.delete({ where: { id } }),
    ]);
    await this.audit.catat(ctx.user.sub, 'warga.hapus', { target: 'User', targetId: id });

    return { message: 'Warga berhasil dihapus.' };
  }

  /** Pengurus RT membuatkan password sementara untuk warga yang lupa password. */
  async resetPassword(ctx: AccessContext, id: number) {
    const warga = await this.findWargaScoped(ctx, id, true);

    const passwordSementara = generatePassword();
    await this.prisma.user.update({
      where: { id },
      data: {
        password: await bcrypt.hash(passwordSementara, SALT_ROUNDS),
        wajibGantiPassword: true,
      },
    });
    await this.audit.catat(ctx.user.sub, 'warga.reset_password', {
      target: 'User',
      targetId: id,
      keterangan: `Atur ulang kata sandi ${warga.namaUser} (${warga.username})`,
    });

    return {
      message: `Kata sandi ${warga.namaUser} berhasil diatur ulang. Sampaikan kata sandi sementara ini ke warga.`,
      passwordSementara,
    };
  }

  // ================================================================
  // RUMAH / BLOK RUMAH
  // ================================================================

  /** Status ikut penghuni: ada penghuni -> dihuni, tanpa penghuni -> kosong. */
  private resolveStatus(userId: number | null, status?: StatusRumah): StatusRumah {
    if (userId) {
      if (status === 'KOSONG') {
        throw new BadRequestException('Rumah yang punya penghuni tidak bisa berstatus KOSONG.');
      }
      return status ?? StatusRumah.DIHUNI_TETAP;
    }
    if (status && status !== 'KOSONG') {
      throw new BadRequestException('Rumah berstatus dihuni harus memiliki penghuni.');
    }
    return StatusRumah.KOSONG;
  }

  private async assertPenghuniBoleh(ctx: AccessContext, userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, area: true },
    });
    if (!user) throw new NotFoundException(`User dengan ID ${userId} tidak ditemukan`);
    assertInArea(ctx, user.area);
  }

  async findAllRumah(ctx: AccessContext) {
    const area = areaFilter(ctx);
    return this.prisma.rumah.findMany({
      where: { isDelete: false, ...rtFilter(area) },
      include: { penghuni: { select: PENGHUNI_SELECT } },
      orderBy: [{ rt: 'asc' }, { blokRumah: 'asc' }],
    });
  }

  async createRumah(ctx: AccessContext, dto: CreateRumahDto) {
    assertInArea(ctx, dto.rt);
    const userId = dto.userId ?? null;
    if (userId) await this.assertPenghuniBoleh(ctx, userId);
    const status = this.resolveStatus(userId, dto.status);

    const existing = await this.prisma.rumah.findUnique({
      where: { rt_blokRumah: { rt: dto.rt, blokRumah: dto.blokRumah } },
    });
    if (existing && !existing.isDelete) {
      throw new ConflictException(`Blok ${dto.blokRumah} di ${dto.rt.replace('_', ' ')} sudah terdaftar.`);
    }

    const include = { penghuni: { select: PENGHUNI_SELECT } };
    // Blok yang pernah dihapus (soft delete) dihidupkan lagi, karena kombinasi RT+blok unik.
    if (existing) {
      return this.prisma.rumah.update({
        where: { id: existing.id },
        data: { userId, status, isDelete: false, updateBy: ctx.user.nama, updateDate: new Date() },
        include,
      });
    }
    return this.prisma.rumah.create({
      data: { rt: dto.rt, blokRumah: dto.blokRumah, userId, status, createBy: ctx.user.nama },
      include,
    });
  }

  async updateRumah(ctx: AccessContext, id: number, dto: UpdateRumahDto) {
    const existing = await this.prisma.rumah.findFirst({ where: { id, isDelete: false } });
    if (!existing) throw new NotFoundException(`Rumah dengan ID ${id} tidak ditemukan`);
    assertInArea(ctx, existing.rt);
    if (dto.rt) assertInArea(ctx, dto.rt);

    const userId = dto.userId !== undefined ? dto.userId : existing.userId;
    if (dto.userId) await this.assertPenghuniBoleh(ctx, dto.userId);

    // Status eksplisit dari klien menang; kalau penghuni berubah tanpa status, ikuti penghuni.
    const statusDiminta =
      dto.status ??
      (dto.userId !== undefined && (dto.userId === null) !== (existing.userId === null)
        ? undefined
        : existing.status);
    const status = this.resolveStatus(userId, statusDiminta);

    try {
      return await this.prisma.rumah.update({
        where: { id },
        data: {
          ...(dto.blokRumah !== undefined && { blokRumah: dto.blokRumah }),
          ...(dto.rt !== undefined && { rt: dto.rt }),
          userId,
          status,
          updateBy: ctx.user.nama,
          updateDate: new Date(),
        },
        include: { penghuni: { select: PENGHUNI_SELECT } },
      });
    } catch (error: any) {
      if (error?.code === 'P2002') {
        throw new ConflictException('Blok rumah tersebut sudah terdaftar di RT ini.');
      }
      throw error;
    }
  }

  async removeRumah(ctx: AccessContext, id: number) {
    const existing = await this.prisma.rumah.findFirst({ where: { id, isDelete: false } });
    if (!existing) throw new NotFoundException(`Rumah dengan ID ${id} tidak ditemukan`);
    assertInArea(ctx, existing.rt);

    await this.prisma.rumah.update({
      where: { id },
      data: {
        isDelete: true,
        userId: null,
        status: 'KOSONG',
        updateBy: ctx.user.nama,
        updateDate: new Date(),
      },
    });
    return { message: 'Rumah berhasil dihapus.' };
  }
}
