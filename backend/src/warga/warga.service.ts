import { PermissionsService } from '../auth/permissions.service';
import { iplMilikAkun, rumahMilikAkun } from '../common/akses-rumah';
import { AkhiriKontrakDto, MulaiKontrakDto } from './dto/kontrak-rumah.dto';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import {
  Prisma,
  RT,
  StatusPembayaran,
  StatusPendaftaran,
  StatusPengajuanHapus,
  StatusRumah,
} from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { NotifikasiService } from '../notifikasi/notifikasi.service';
import { AuditService } from '../audit/audit.service';
import { FileService } from '../common/file/file.service';
import { SALT_ROUNDS } from '../auth/auth.service';
import { AccessContext } from '../auth/auth.types';
import { resolvePeriode } from '../common/periode.helper';
import { areaFilter, assertInArea, rtFilter, wargaBacaWhere } from '../common/scope.helper';
import { generatePassword, LEVEL_ADMIN, LEVEL_WARGA, totalTagihan, withTotal } from '../common/helpers';
import { CreateWargaDto } from './dto/create-warga.dto';
import { UpdateWargaDto } from './dto/update-warga.dto';
import { CreateRumahDto } from './dto/create-rumah.dto';
import { UpdateRumahDto } from './dto/update-rumah.dto';
import { DaftarMandiriDto } from './dto/daftar-mandiri.dto';

const SEMUA_RT: RT[] = ['RT_01', 'RT_02', 'RT_03', 'RT_04'];

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

const WARGA_SELECT = {
  id: true,
  namaUser: true,
  username: true,
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
  rumahSewa: {
    where: { isDelete: false },
    orderBy: [{ rt: 'asc' }, { blokRumah: 'asc' }],
    select: RUMAH_SELECT,
  },
} satisfies Prisma.UserSelect;

const PENGHUNI_SELECT = {
  id: true,
  namaUser: true,
  username: true,
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
    private files: FileService,
    private permissions: PermissionsService,
  ) {}


  private async assertBolehLihatUser(ctx: AccessContext, targetUserId: number) {
    if (targetUserId === ctx.user.sub) return;
    if (ctx.scope === 'ALL') return;
    if (ctx.scope === 'OWN') {
      throw new ForbiddenException('Anda hanya dapat melihat data milik sendiri.');
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
      where: rumahMilikAkun(userId),
      orderBy: [{ rt: 'asc' }, { blokRumah: 'asc' }],
    });
  }

  async getTagihanByRumah(ctx: AccessContext, rumahId: number) {
    const rumah = await this.prisma.rumah.findFirst({
      where: { id: rumahId, isDelete: false },
    });
    if (!rumah) throw new NotFoundException(`Rumah dengan ID ${rumahId} tidak ditemukan`);

    const terkait = rumah.userId === ctx.user.sub || rumah.penyewaId === ctx.user.sub;
    if (!terkait) {
      if (ctx.scope === 'OWN') {
        throw new ForbiddenException('Rumah ini bukan milik Anda.');
      }
      assertInArea(ctx, rumah.rt);
    }

    const tagihan = await this.prisma.ipl.findMany({
      where: terkait ? { AND: [{ idRumah: rumahId }, iplMilikAkun(ctx.user.sub)] } : { idRumah: rumahId },
      include: {
        pembayaran: {
          orderBy: { tanggalBayar: 'desc' },
          take: 1,
          select: { idPembayaran: true, buktiTransaksi: true, tanggalBayar: true, tanggalKonfirmasi: true },
        },
      },
      orderBy: [{ tahunPeriode: 'desc' }, { bulanPeriode: 'desc' }],
    });

    return { rumah, tagihan: tagihan.map(withTotal) };
  }

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
      where: rumahMilikAkun(userId),
      orderBy: [{ rt: 'asc' }, { blokRumah: 'asc' }],
    });

    if (rumah.length === 0) {
      return { rumah: [], tagihan: [], summaryByPeriode: {}, totalSummary: null };
    }

    const where: Prisma.IplWhereInput = { idRumah: { in: rumah.map((r) => r.id) } };
    const and: Prisma.IplWhereInput[] = [iplMilikAkun(userId)];
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
          select: { idPembayaran: true, buktiTransaksi: true, tanggalBayar: true, tanggalKonfirmasi: true, nominal: true },
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

  async uploadBuktiPembayaran(
    ctx: AccessContext,
    data: { idIpl: number; bukti?: Express.Multer.File },
  ) {
    if (!data.bukti) throw new BadRequestException('Bukti pembayaran wajib diunggah.');

    const ipl = await this.prisma.ipl.findUnique({
      where: { id: data.idIpl },
      include: { rumah: true },
    });
    if (!ipl) throw new NotFoundException('Tagihan tidak ditemukan');

    if (ctx.scope === 'OWN') {
      const boleh = await this.prisma.ipl.count({ where: { AND: [{ id: ipl.id }, iplMilikAkun(ctx.user.sub)] } });
      if (boleh === 0) {
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

    const buktiId = await this.files.simpan(data.bukti);
    const pembayaran = await this.prisma
      .$transaction(async (tx) => {
        const klaim = await tx.ipl.updateMany({
          where: { id: data.idIpl, statusPembayaran: 'BELUM_LUNAS' },
          data: { statusPembayaran: 'MENUNGGU_KONFIRMASI' },
        });
        if (klaim.count !== 1) {
          throw new ConflictException('Tagihan ini sudah dibayar atau bukti pembayarannya sedang diproses.');
        }
        return tx.pembayaranIpl.create({
          data: {
            idUser: ctx.user.sub,
            idIpl: data.idIpl,
            nominal: totalTagihan(ipl),
            buktiTransaksi: buktiId,
          },
        });
      })
      .catch(async (err) => {
        await this.files.hapus(buktiId);
        throw err;
      });

    const pembayarRole = await this.prisma.role.findUnique({
      where: { id: ctx.user.roleId },
      select: { level: true },
    });
    const kodePermissionNotif =
      pembayarRole && pembayarRole.level < LEVEL_WARGA ? 'ipl.konfirmasi_pengurus' : 'ipl.konfirmasi';

    await this.notifikasiService.kirimKePermission(
      kodePermissionNotif,
      ipl.rumah.rt,
      'PEMBAYARAN_MASUK',
      'Bukti Pembayaran Baru',
      `Warga blok ${ipl.rumah.blokRumah} mengirim bukti pembayaran IPL, menunggu konfirmasi.`,
      '/dashboard/kelola-ipl/tagihan-warga',
      ctx.user.sub,
    );

    return { message: 'Bukti pembayaran berhasil dikirim. Menunggu konfirmasi.', data: pembayaran };
  }


  private async findWargaScoped(ctx: AccessContext, id: number, tulis = false) {
    const area = areaFilter(ctx);
    const penuh = area === null && (await this.adalahAdmin(ctx));
    const warga = await this.prisma.user.findFirst({
      where: penuh
        ? { AND: [{ id }, wargaBacaWhere(null)] }
        : tulis
          ? { id, role: { level: LEVEL_WARGA }, ...(area && { area }) }
          : { AND: [{ id }, wargaBacaWhere(area)] },
      select: WARGA_SELECT,
    });
    if (!warga) throw new NotFoundException(`Warga dengan ID ${id} tidak ditemukan`);
    return warga;
  }

  private async adalahAdmin(ctx: AccessContext): Promise<boolean> {
    const role = await this.prisma.role.findUnique({
      where: { id: ctx.user.roleId },
      select: { level: true },
    });
    return role?.level === LEVEL_ADMIN;
  }

  private handleUniqueError(error: any): never {
    if (error?.code === 'P2002') {
      throw new ConflictException('Nama pengguna / no HP ini sudah terdaftar. Gunakan yang lain.');
    }
    throw error;
  }

  async usernameTersedia(username: string, abaikanId?: number) {
    const u = username.trim();
    if (!u) return false;
    const ada = await this.prisma.user.findFirst({
      where: { username: u, ...(abaikanId ? { id: { not: abaikanId } } : {}) },
      select: { id: true },
    });
    return !ada;
  }

  async saranUsername(nama: string, noHp?: string, abaikanId?: number) {
    const kata = (nama ?? '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .split(/\s+/)
      .map((k) => k.replace(/[^a-z0-9]/g, ''))
      .filter(Boolean);
    const dasar = (kata[kata.length - 1] ?? 'warga').slice(0, 20);
    const digit = (noHp ?? '').replace(/\D/g, '');
    const kandidat: string[] = [];
    if (digit.length >= 2) kandidat.push(dasar + digit.slice(-2));
    if (digit.length >= 3) kandidat.push(dasar + digit.slice(-3));
    for (let i = 0; i < 30; i++) kandidat.push(dasar + String(10 + Math.floor(Math.random() * 90)));
    for (let i = 0; i < 30; i++) kandidat.push(dasar + String(100 + Math.floor(Math.random() * 9900)));
    for (const k of kandidat) {
      if (await this.usernameTersedia(k, abaikanId)) return k;
    }
    return dasar + Date.now().toString().slice(-6);
  }

  async create(ctx: AccessContext, dto: CreateWargaDto) {
    assertInArea(ctx, dto.rt);

    const roleWarga = await this.prisma.role.findFirst({
      where: { level: LEVEL_WARGA, isSystem: true },
    });
    if (!roleWarga) {
      throw new InternalServerErrorException('Peran warga belum tersedia. Jalankan seed database.');
    }

    const username = dto.username?.trim() || (await this.saranUsername(dto.nama, dto.no_hp));
    const passwordAwal = dto.password ?? generatePassword();
    const password = await bcrypt.hash(passwordAwal, SALT_ROUNDS);
    const status = dto.statusRumah ?? StatusRumah.DIHUNI_TETAP;
    const actor = ctx.user.nama;
    const ctxBolehKontrak =
      dto.sebagaiPenyewa !== true || (await this.permissions.scopeOf(ctx.user.roleId, 'rumah.kontrak')) !== null;

    try {
      const user = await this.prisma.$transaction(async (tx) => {
        const rumah = await tx.rumah.findUnique({
          where: { rt_blokRumah: { rt: dto.rt, blokRumah: dto.blokRumah } },
        });
        if (!rumah || rumah.isDelete) {
          throw new NotFoundException(
            `Blok ${dto.blokRumah} di ${dto.rt.replace('_', ' ')} belum terdaftar. Minta admin menambahkan rumah ini terlebih dahulu.`,
          );
        }
        const sebagaiPenyewa = dto.sebagaiPenyewa === true;
        if (sebagaiPenyewa) {
          if (!ctxBolehKontrak) {
            throw new ForbiddenException('Anda tidak berhak mendaftarkan penyewa kontrak.');
          }
          if (rumah.penyewaId) {
            throw new ConflictException(`Blok ${dto.blokRumah} masih punya penyewa aktif. Akhiri kontraknya dulu.`);
          }
        } else if (rumah.userId) {
          throw new ConflictException(`Blok ${dto.blokRumah} sudah ada pemilik/penanggung jawab lain.`);
        }

        const created = await tx.user.create({
          data: {
            namaUser: dto.nama.trim(),
            username,
            noTelp: dto.no_hp,
            password,
            roleId: roleWarga.id,
            area: dto.rt,
            wajibGantiPassword: true,
          },
          select: { id: true },
        });

        const klaim = sebagaiPenyewa
          ? await tx.rumah.updateMany({
              where: { id: rumah.id, penyewaId: null, isDelete: false },
              data: {
                penyewaId: created.id,
                kontrakMulai: new Date(),
                status: StatusRumah.DIHUNI_KONTRAK,
                updateBy: actor,
                updateDate: new Date(),
              },
            })
          : await tx.rumah.updateMany({
              where: { id: rumah.id, userId: null, isDelete: false },
              data: { userId: created.id, status, updateBy: actor, updateDate: new Date() },
            });
        if (klaim.count !== 1) {
          throw new ConflictException(
            sebagaiPenyewa
              ? `Blok ${dto.blokRumah} baru saja mendapat penyewa lain.`
              : `Blok ${dto.blokRumah} sudah ada pemilik/penanggung jawab lain.`,
          );
        }
        return created;
      });

      return {
        message: 'Akun warga dan data rumah berhasil dibuat!',
        data: await this.findWargaScoped(ctx, user.id),
        passwordAwal,
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
          { rumahSewa: { some: { blokRumah: { contains: q }, isDelete: false } } },
        ],
      });
    }
    return this.prisma.user.findMany({
      where: { AND: and },
      select: WARGA_SELECT,
      orderBy: [{ area: 'asc' }, { namaUser: 'asc' }],
    });
  }

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
    if (id === ctx.user.sub) {
      throw new BadRequestException('Akun yang sedang Anda pakai tidak bisa dihapus.');
    }
    await this.findWargaScoped(ctx, id, true);

    const rumahMilik = await this.prisma.rumah.findMany({
      where: { OR: [{ userId: id }, { penyewaId: id }], isDelete: false },
      select: { id: true, blokRumah: true, rt: true, status: true },
    });
    if (rumahMilik.length > 0) {
      const daftar = rumahMilik.map((r) => `${r.blokRumah} (${r.rt.replace('_', ' ')})`).join(', ');
      throw new BadRequestException(
        `Warga ini masih tercatat sebagai pemilik/penanggung jawab rumah: ${daftar}. Tunjuk pemilik pengganti dulu lewat Ubah Rumah sebelum menghapus akun.`,
      );
    }

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
      this.prisma.notifikasi.deleteMany({ where: { idUser: id } }),
      this.prisma.user.delete({ where: { id } }),
    ]);
    await this.audit.catat(ctx.user.sub, 'warga.hapus', { target: 'User', targetId: id });

    return { message: 'Warga berhasil dihapus.' };
  }

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


  async ajukanHapus(ctx: AccessContext, id: number, alasan: string) {
    if (id === ctx.user.sub) {
      throw new BadRequestException('Akun yang sedang Anda pakai tidak bisa diajukan untuk dihapus.');
    }
    const warga = await this.findWargaScoped(ctx, id, true);

    const area = warga.area ?? 'RW';
    await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM tb_User WHERE id = ${id} FOR UPDATE`;
      const sudahAda = await tx.pengajuanHapusWarga.findFirst({
        where: { userId: id, status: 'MENUNGGU' },
        select: { id: true },
      });
      if (sudahAda) {
        throw new ConflictException('Warga ini sudah punya pengajuan hapus yang menunggu keputusan RW.');
      }
      return tx.pengajuanHapusWarga.create({
        data: {
          userId: id,
          namaUser: warga.namaUser,
          rt: area,
          alasan: alasan.trim(),
          diajukanOleh: ctx.user.nama,
          diajukanOlehId: ctx.user.sub,
        },
        select: { id: true },
      });
    });
    await this.audit.catat(ctx.user.sub, 'warga.ajukan_hapus', {
      target: 'User',
      targetId: id,
      keterangan: `Mengajukan hapus akun ${warga.namaUser}: ${alasan.trim()}`,
    });
    await this.notifikasiService.kirimKePermission(
      'warga.approve_hapus',
      null,
      'PENGAJUAN_MASUK',
      'Pengajuan Hapus Akun Warga',
      `${ctx.user.nama} mengajukan penghapusan akun ${warga.namaUser} (${area.replace('_', ' ')}), menunggu persetujuan.`,
      '/dashboard/data-warga/pengajuan-hapus',
      ctx.user.sub,
    );

    return { message: `Pengajuan hapus akun ${warga.namaUser} dikirim ke RW untuk disetujui.` };
  }

  async getPengajuanHapus(ctx: AccessContext, status?: string) {
    const area = areaFilter(ctx);
    return this.prisma.pengajuanHapusWarga.findMany({
      where: {
        ...(area !== null && { rt: area }),
        ...(status !== 'SEMUA' && { status: (status as StatusPengajuanHapus) || 'MENUNGGU' }),
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  private async findPengajuanHapusMenunggu(id: number) {
    const p = await this.prisma.pengajuanHapusWarga.findUnique({ where: { id } });
    if (!p) throw new NotFoundException(`Pengajuan dengan ID ${id} tidak ditemukan`);
    if (p.status !== 'MENUNGGU') {
      throw new BadRequestException('Pengajuan ini sudah diputuskan sebelumnya.');
    }
    return p;
  }

  async setujuiHapus(ctx: AccessContext, id: number) {
    const p = await this.findPengajuanHapusMenunggu(id);

    const user = await this.prisma.user.findFirst({
      where: { id: p.userId, role: { level: LEVEL_WARGA } },
      select: { id: true, namaUser: true },
    });
    if (!user) {
      throw new NotFoundException('Akun warga ini sudah tidak ada. Tolak pengajuan ini untuk menutupnya.');
    }

    const [pembayaran, pengaduan] = await Promise.all([
      this.prisma.pembayaranIpl.count({ where: { idUser: p.userId } }),
      this.prisma.pengaduan.count({ where: { idUser: p.userId } }),
    ]);
    if (pembayaran > 0 || pengaduan > 0) {
      throw new BadRequestException(
        'Akun ini punya riwayat pembayaran/pengaduan sehingga tidak bisa dihapus permanen. Tolak pengajuan ini, atau kosongkan rumahnya lewat Ubah Rumah.',
      );
    }

    const rumah = await this.prisma.rumah.findMany({
      where: { userId: p.userId, isDelete: false },
      select: { id: true, blokRumah: true, rt: true },
    });

    await this.prisma.$transaction(async (tx) => {
      const klaim = await tx.pengajuanHapusWarga.updateMany({
        where: { id, status: 'MENUNGGU' },
        data: { status: 'DISETUJUI', diprosesOleh: ctx.user.nama, diprosesAt: new Date() },
      });
      if (klaim.count !== 1) throw new BadRequestException('Pengajuan ini sudah diputuskan sebelumnya.');

      await tx.rumah.updateMany({
        where: { userId: p.userId },
        data: { userId: null, status: 'KOSONG', updateBy: ctx.user.nama, updateDate: new Date() },
      });
      await tx.rumah.updateMany({
        where: { penyewaId: p.userId },
        data: { penyewaId: null, kontrakMulai: null, status: 'KOSONG', updateBy: ctx.user.nama, updateDate: new Date() },
      });
      await tx.notifikasi.deleteMany({ where: { idUser: p.userId } });
      await tx.user.delete({ where: { id: p.userId } });
    });

    const blok = rumah.map((r) => `${r.blokRumah} (${r.rt.replace('_', ' ')})`).join(', ');
    await this.audit.catat(ctx.user.sub, 'warga.hapus', {
      target: 'User',
      targetId: p.userId,
      keterangan: `Akun ${p.namaUser} dihapus atas pengajuan ${p.diajukanOleh}${blok ? `; rumah dilepas: ${blok}` : ''}`,
    });
    await this.notifikasiService.kirim(
      p.diajukanOlehId,
      'PENGAJUAN_DISETUJUI',
      'Pengajuan Hapus Akun Disetujui',
      `Akun ${p.namaUser} sudah dihapus oleh ${ctx.user.nama}.`,
      '/dashboard/data-warga',
    );

    return { message: `Akun ${p.namaUser} dihapus.${blok ? ` Rumah ${blok} kini berstatus kosong.` : ''}` };
  }

  async tolakHapus(ctx: AccessContext, id: number, alasan: string) {
    const p = await this.findPengajuanHapusMenunggu(id);
    const klaim = await this.prisma.pengajuanHapusWarga.updateMany({
      where: { id, status: 'MENUNGGU' },
      data: { status: 'DITOLAK', alasanTolak: alasan.trim(), diprosesOleh: ctx.user.nama, diprosesAt: new Date() },
    });
    if (klaim.count !== 1) throw new BadRequestException('Pengajuan ini sudah diputuskan sebelumnya.');
    await this.notifikasiService.kirim(
      p.diajukanOlehId,
      'PENGAJUAN_DITOLAK',
      'Pengajuan Hapus Akun Ditolak',
      `Pengajuan hapus akun ${p.namaUser} ditolak: ${alasan.trim()}`,
      '/dashboard/data-warga/pengajuan-hapus',
    );
    return { message: `Pengajuan hapus akun ${p.namaUser} ditolak.` };
  }


  private resolveStatus(userId: number | null, status?: StatusRumah): StatusRumah {
    if (status === 'KOSONG') {
      return StatusRumah.KOSONG;
    }
    if (status === 'DIHUNI_KONTRAK' || status === 'DIHUNI_TETAP') {
      if (!userId) {
        throw new BadRequestException('Rumah berstatus dihuni harus memiliki pemilik/penghuni.');
      }
      return status;
    }
    return userId ? StatusRumah.DIHUNI_TETAP : StatusRumah.KOSONG;
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
      include: {
        penghuni: { select: PENGHUNI_SELECT },
        penyewa: { select: { id: true, namaUser: true, username: true, noTelp: true } },
      },
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
    if (existing) {
      const revived = await this.prisma.rumah.update({
        where: { id: existing.id },
        data: { userId, status, isDelete: false, updateBy: ctx.user.nama, updateDate: new Date() },
        include,
      });
      await this.audit.catat(ctx.user.sub, 'rumah.ubah_status', {
        target: 'Rumah',
        targetId: existing.id,
        keterangan: `Blok ${existing.blokRumah} (${dto.rt.replace('_', ' ')}) diaktifkan lagi: ${status}${userId ? '' : ' (tanpa pemilik)'}`,
      });
      return revived;
    }
    const created = await this.prisma.rumah.create({
      data: { rt: dto.rt, blokRumah: dto.blokRumah, userId, status, createBy: ctx.user.nama },
      include,
    });
    await this.audit.catat(ctx.user.sub, 'rumah.ubah_status', {
      target: 'Rumah',
      targetId: created.id,
      keterangan: `Blok ${dto.blokRumah} (${dto.rt.replace('_', ' ')}) didaftarkan: ${status}${userId ? '' : ' (tanpa pemilik)'}`,
    });
    return created;
  }

  async updateRumah(ctx: AccessContext, id: number, dto: UpdateRumahDto) {
    const existing = await this.prisma.rumah.findFirst({ where: { id, isDelete: false } });
    if (!existing) throw new NotFoundException(`Rumah dengan ID ${id} tidak ditemukan`);
    assertInArea(ctx, existing.rt);
    if (dto.rt) assertInArea(ctx, dto.rt);

    const userId = dto.userId !== undefined ? dto.userId : existing.userId;
    if (dto.userId) await this.assertPenghuniBoleh(ctx, dto.userId);

    const statusDiminta =
      dto.status ??
      (dto.userId !== undefined && (dto.userId === null) !== (existing.userId === null)
        ? undefined
        : existing.status);
    const status = this.resolveStatus(userId, statusDiminta);

    try {
      const updated = await this.prisma.rumah.update({
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
      if (existing.status !== status || existing.userId !== userId) {
        const rtLabel = (existing.rt as string).replace('_', ' ');
        await this.audit.catat(ctx.user.sub, 'rumah.ubah_status', {
          target: 'Rumah',
          targetId: id,
          keterangan: `Blok ${existing.blokRumah} (${rtLabel}): ${existing.status}${existing.userId ? '' : ' (tanpa pemilik)'} -> ${status}${userId ? '' : ' (tanpa pemilik)'}`,
        });
        if (status === 'KOSONG' && existing.status !== 'KOSONG') {
          await this.notifikasiService.kirimKePermissionAreaPersis(
            'setoran.read',
            'RW',
            'PERUBAHAN_DATA',
            'Rumah Diubah Kosong',
            `${ctx.user.nama} mengubah blok ${existing.blokRumah} (${rtLabel}) dari ${existing.status} menjadi KOSONG. Tagihan rumah ini masuk kas RT dan tidak disetor ke RW.`,
            '/dashboard/data-warga/blok-rumah',
            ctx.user.sub,
          );
        }
      }
      return updated;
    } catch (error: any) {
      if (error?.code === 'P2002') {
        throw new ConflictException('Blok rumah tersebut sudah terdaftar di RT ini.');
      }
      throw error;
    }
  }

  async mulaiKontrak(ctx: AccessContext, rumahId: number, dto: MulaiKontrakDto) {
    const rumah = await this.prisma.rumah.findFirst({ where: { id: rumahId, isDelete: false } });
    if (!rumah) throw new NotFoundException(`Rumah dengan ID ${rumahId} tidak ditemukan`);
    assertInArea(ctx, rumah.rt);
    if (rumah.penyewaId) {
      throw new ConflictException('Rumah ini masih punya penyewa aktif. Akhiri kontraknya dulu sebelum menambah penyewa baru.');
    }
    if (dto.penyewaId === rumah.userId) {
      throw new BadRequestException('Penyewa tidak boleh akun pemilik rumah itu sendiri.');
    }
    const penyewa = await this.prisma.user.findFirst({
      where: { id: dto.penyewaId, role: { level: LEVEL_WARGA } },
      select: { id: true, namaUser: true, area: true },
    });
    if (!penyewa) throw new NotFoundException('Akun warga untuk penyewa tidak ditemukan.');
    assertInArea(ctx, penyewa.area);

    const updated = await this.prisma.rumah.update({
      where: { id: rumahId },
      data: {
        penyewaId: penyewa.id,
        kontrakMulai: new Date(),
        status: StatusRumah.DIHUNI_KONTRAK,
        updateBy: ctx.user.nama,
        updateDate: new Date(),
      },
      include: { penyewa: { select: { id: true, namaUser: true, username: true, noTelp: true } } },
    });
    const rtLabel = (rumah.rt as string).replace('_', ' ');
    await this.audit.catat(ctx.user.sub, 'rumah.kontrak_mulai', {
      target: 'Rumah',
      targetId: rumahId,
      keterangan: `Blok ${rumah.blokRumah} (${rtLabel}): kontrak dimulai, penyewa ${penyewa.namaUser}.`,
    });
    await this.notifikasiService.kirimBanyak(
      [penyewa.id],
      'PERUBAHAN_DATA',
      'Anda Terdaftar Sebagai Penyewa',
      `Anda terdaftar sebagai penyewa blok ${rumah.blokRumah} (${rtLabel}). Tagihan IPL rumah ini berikutnya akan masuk ke akun Anda.`,
      '/dashboard/kelola-ipl/tagihan-warga',
    );
    return { message: `Kontrak dimulai. ${penyewa.namaUser} kini menjadi penyewa blok ${rumah.blokRumah}.`, data: updated };
  }

  async akhiriKontrak(ctx: AccessContext, rumahId: number, dto: AkhiriKontrakDto) {
    const rumah = await this.prisma.rumah.findFirst({
      where: { id: rumahId, isDelete: false },
      include: { penyewa: { select: { id: true, namaUser: true } } },
    });
    if (!rumah) throw new NotFoundException(`Rumah dengan ID ${rumahId} tidak ditemukan`);
    assertInArea(ctx, rumah.rt);
    if (!rumah.penyewaId || !rumah.penyewa) {
      throw new BadRequestException('Rumah ini tidak sedang dikontrakkan.');
    }
    const statusSetelah = dto.statusSetelah ?? StatusRumah.KOSONG;
    if (statusSetelah === StatusRumah.DIHUNI_TETAP && !rumah.userId) {
      throw new BadRequestException('Rumah tanpa pemilik terdaftar tidak bisa berstatus dihuni tetap.');
    }

    const updated = await this.prisma.rumah.update({
      where: { id: rumahId },
      data: {
        penyewaId: null,
        kontrakMulai: null,
        status: statusSetelah,
        updateBy: ctx.user.nama,
        updateDate: new Date(),
      },
    });
    const rtLabel = (rumah.rt as string).replace('_', ' ');
    await this.audit.catat(ctx.user.sub, 'rumah.kontrak_akhir', {
      target: 'Rumah',
      targetId: rumahId,
      keterangan: `Blok ${rumah.blokRumah} (${rtLabel}): kontrak ${rumah.penyewa.namaUser} berakhir, status -> ${statusSetelah}.`,
    });
    await this.notifikasiService.kirimBanyak(
      [rumah.penyewa.id],
      'PERUBAHAN_DATA',
      'Kontrak Rumah Berakhir',
      `Kontrak Anda di blok ${rumah.blokRumah} (${rtLabel}) telah diakhiri pengurus. Tagihan baru rumah ini tidak lagi ke akun Anda.`,
    );
    if (rumah.userId) {
      await this.notifikasiService.kirimBanyak(
        [rumah.userId],
        'PERUBAHAN_DATA',
        'Kontrak Rumah Berakhir',
        `Kontrak penyewa di blok ${rumah.blokRumah} (${rtLabel}) telah berakhir. Tagihan IPL rumah ini kembali ke akun Anda.`,
        '/dashboard/kelola-ipl/tagihan-warga',
      );
    }
    return { message: 'Kontrak diakhiri. Tagihan berikutnya kembali ke pemilik.', data: updated };
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


  async getRumahKosong(rt: string) {
    if (!SEMUA_RT.includes(rt as RT)) {
      throw new BadRequestException('RT tidak valid.');
    }
    return this.prisma.rumah.findMany({
      where: { rt: rt as RT, isDelete: false, status: 'KOSONG', userId: null },
      select: { id: true, blokRumah: true },
      orderBy: { blokRumah: 'asc' },
    });
  }

  async daftarMandiri(dto: DaftarMandiriDto) {
    const rumah = await this.prisma.rumah.findFirst({
      where: { id: dto.rumahId, rt: dto.rt, isDelete: false, status: 'KOSONG', userId: null },
    });
    if (!rumah) {
      throw new BadRequestException(
        'Rumah yang dipilih tidak tersedia lagi. Muat ulang halaman dan pilih blok lain.',
      );
    }

    const [userDuplikat, pendaftaranDuplikat] = await Promise.all([
      this.prisma.user.findFirst({
        where: { username: dto.noTelp },
        select: { id: true },
      }),
      this.prisma.pendaftaranWarga.findFirst({
        where: { noTelp: dto.noTelp, status: 'PENDING' },
        select: { id: true },
      }),
    ]);
    if (userDuplikat) {
      throw new ConflictException('Nomor HP ini sudah terdaftar sebagai akun.');
    }
    if (pendaftaranDuplikat) {
      throw new ConflictException(
        'Nomor HP ini sudah punya pendaftaran yang masih menunggu persetujuan pengurus.',
      );
    }

    const password = await bcrypt.hash(dto.password, SALT_ROUNDS);
    const pendaftaran = await this.prisma.pendaftaranWarga.create({
      data: {
        namaUser: dto.namaUser.trim(),
        noTelp: dto.noTelp.trim(),
        password,
        rt: dto.rt,
        rumahId: dto.rumahId,
      },
    });

    await this.notifikasiService.kirimKePermission(
      'warga.approve_registrasi',
      dto.rt,
      'PENDAFTARAN_BARU',
      'Pendaftaran Warga Baru',
      `${pendaftaran.namaUser} mendaftar untuk blok ${rumah.blokRumah}, menunggu persetujuan.`,
      '/dashboard/data-warga',
    );

    return { message: 'Pendaftaran berhasil dikirim. Menunggu persetujuan pengurus RT.' };
  }

  async getPendaftaran(ctx: AccessContext, status?: string) {
    const area = areaFilter(ctx);
    return this.prisma.pendaftaranWarga.findMany({
      where: {
        ...(area !== null && { rt: area as RT }),
        status: (status && status !== 'SEMUA' ? status : 'PENDING') as StatusPendaftaran,
      },
      include: { rumah: { select: { id: true, blokRumah: true, rt: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  private async findPendaftaranScoped(ctx: AccessContext, id: number) {
    const pendaftaran = await this.prisma.pendaftaranWarga.findUnique({ where: { id } });
    if (!pendaftaran) throw new NotFoundException(`Pendaftaran dengan ID ${id} tidak ditemukan`);
    assertInArea(ctx, pendaftaran.rt);
    if (pendaftaran.status !== 'PENDING') {
      throw new BadRequestException('Pendaftaran ini sudah diproses sebelumnya.');
    }
    return pendaftaran;
  }

  async setujuiPendaftaran(ctx: AccessContext, id: number, statusHunian?: StatusRumah) {
    const pendaftaran = await this.findPendaftaranScoped(ctx, id);
    const statusAwal: StatusRumah = statusHunian ?? StatusRumah.KOSONG;

    const roleWarga = await this.prisma.role.findFirst({
      where: { level: LEVEL_WARGA, isSystem: true },
    });
    if (!roleWarga) {
      throw new InternalServerErrorException('Peran warga belum tersedia. Jalankan seed database.');
    }

    try {
      const user = await this.prisma.$transaction(async (tx) => {
        const rumah = await tx.rumah.findUnique({ where: { id: pendaftaran.rumahId } });
        if (!rumah || rumah.isDelete || rumah.userId) {
          throw new ConflictException(
            'Rumah yang dipilih sudah terisi warga lain. Tolak pendaftaran ini dan minta warga mendaftar ulang.',
          );
        }

        const created = await tx.user.create({
          data: {
            namaUser: pendaftaran.namaUser,
            username: pendaftaran.noTelp,
            noTelp: pendaftaran.noTelp,
            password: pendaftaran.password,
            roleId: roleWarga.id,
            area: pendaftaran.rt,
            wajibGantiPassword: false,
          },
          select: { id: true },
        });

        const klaimRumah = await tx.rumah.updateMany({
          where: { id: rumah.id, userId: null, isDelete: false },
          data: { userId: created.id, status: statusAwal, updateBy: ctx.user.nama, updateDate: new Date() },
        });
        const klaimDaftar = await tx.pendaftaranWarga.updateMany({
          where: { id: pendaftaran.id, status: 'PENDING' },
          data: { status: 'DISETUJUI', diprosesOleh: ctx.user.nama, diprosesAt: new Date() },
        });
        if (klaimRumah.count !== 1 || klaimDaftar.count !== 1) {
          throw new ConflictException(
            'Pendaftaran ini baru saja diproses atau rumahnya sudah terisi warga lain. Muat ulang halaman.',
          );
        }

        return created;
      });

      return { message: `${pendaftaran.namaUser} disetujui dan akun warga dibuat.`, data: user };
    } catch (error) {
      this.handleUniqueError(error);
    }
  }

  async tolakPendaftaran(ctx: AccessContext, id: number, alasan: string) {
    const pendaftaran = await this.findPendaftaranScoped(ctx, id);
    await this.prisma.pendaftaranWarga.update({
      where: { id: pendaftaran.id },
      data: { status: 'DITOLAK', alasanTolak: alasan, diprosesOleh: ctx.user.nama, diprosesAt: new Date() },
    });
    return { message: `Pendaftaran ${pendaftaran.namaUser} ditolak.` };
  }
}
