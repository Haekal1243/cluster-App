import {
  Injectable,
  NotFoundException,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { CreateWargaDto } from './dto/create-warga.dto';
import { UpdateWargaDto } from './dto/update-warga.dto';
import { CreateRumahDto } from './dto/create-rumah.dto';
import { UpdateRumahDto } from './dto/update-rumah.dto';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, Role, RT, StatusPembayaran } from '@prisma/client';
import { NotifikasiService } from '../notifikasi/notifikasi.service';

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

@Injectable()
export class WargaService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private notifikasiService: NotifikasiService,
  ) {}

  // ================================================================
  // AUTH
  // ================================================================

  async login(email: string, pass: string) {
    const user = await this.prisma.user.findFirst({
      where: { email },
    });

    if (!user) throw new UnauthorizedException('Email tidak ditemukan!');
    if (user.password !== pass) throw new UnauthorizedException('Password salah!');

    const token = await this.jwtService.signAsync({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    return {
      message: 'Login berhasil',
      token,
      user: {
        id: user.id,
        nama: user.namaUser,
        name: user.namaUser,
        email: user.email,
        role: user.role,
        noTelp: user.noTelp,
      },
    };
  }

  // ================================================================
  // PORTAL WARGA — Endpoints khusus untuk akun WARGA
  // ================================================================

  /** Ambil semua rumah milik user (berdasarkan userId) */
  async getRumahByUser(userId: number) {
    return this.prisma.rumah.findMany({
      where: { userId },
      orderBy: [{ rt: 'asc' }, { blokRumah: 'asc' }],
    });
  }

  /** Ambil semua tagihan IPL untuk 1 rumah, diurutkan terbaru di atas */
  async getTagihanByRumah(rumahId: number) {
    const rumah = await this.prisma.rumah.findUnique({ where: { id: rumahId } });
    if (!rumah) throw new NotFoundException(`Rumah dengan ID ${rumahId} tidak ditemukan`);

    const tagihan = await this.prisma.ipl.findMany({
      where: { idRumah: rumahId },
      include: {
        pembayaran: {
          orderBy: { tanggalBayar: 'desc' },
          take: 1,
          select: { buktiTransaksi: true, tanggalBayar: true },
        },
      },
      orderBy: [{ tahunPeriode: 'desc' }, { bulanPeriode: 'desc' }],
    });

    return { rumah, tagihan };
  }

  /** Ambil semua tagihan IPL untuk semua rumah milik user (gabungan), dengan filter periode opsional */
  async getTagihanByUser(userId: number, bulan?: string, tahun?: string) {
    const rumah = await this.prisma.rumah.findMany({
      where: { userId },
      orderBy: [{ rt: 'asc' }, { blokRumah: 'asc' }],
    });

    if (rumah.length === 0) {
      return {
        rumah: [],
        tagihan: [],
        summaryByPeriode: {},
        totalSummary: null,
      };
    }

    const rumahIds = rumah.map((r) => r.id);

    const where: Prisma.IplWhereInput = { idRumah: { in: rumahIds } };
    if (bulan) where.bulanPeriode = bulan;
    if (tahun) where.tahunPeriode = tahun;

    const tagihan = await this.prisma.ipl.findMany({
      where,
      include: {
        rumah: { select: { id: true, blokRumah: true, rt: true } },
        pembayaran: {
          orderBy: { tanggalBayar: 'desc' },
          take: 1,
          select: { buktiTransaksi: true, tanggalBayar: true, nominal: true },
        },
      },
      orderBy: [
        { tahunPeriode: 'desc' },
        { bulanPeriode: 'desc' },
        { rumah: { rt: 'asc' } },
        { rumah: { blokRumah: 'asc' } },
      ],
    });

    const summaryByPeriode: Record<string, RingkasanPeriode> = {};
    for (const t of tagihan) {
      const key = `${t.bulanPeriode}/${t.tahunPeriode}`;
      if (!summaryByPeriode[key]) {
        const m = parseInt(t.bulanPeriode, 10);
        const MONTHS = [
          'Jan',
          'Feb',
          'Mar',
          'Apr',
          'Mei',
          'Jun',
          'Jul',
          'Agu',
          'Sep',
          'Okt',
          'Nov',
          'Des',
        ];
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
      totalBelumLunas: tagihan.filter(
        (t) => t.statusPembayaran === 'BELUM_LUNAS',
      ).length,
      totalMenunggu: tagihan.filter(
        (t) => t.statusPembayaran === 'MENUNGGU_KONFIRMASI',
      ).length,
    };

    return { rumah, tagihan, summaryByPeriode, totalSummary };
  }

  /** Submit bukti pembayaran oleh warga */
  async uploadBuktiPembayaran(data: {
    idUser: number;
    idIpl: number;
    nominal: number;
    buktiTransaksi: string;
  }) {
    // Pastikan tagihan ada
    const ipl = await this.prisma.ipl.findUnique({ where: { id: data.idIpl } });
    if (!ipl) throw new NotFoundException('Tagihan tidak ditemukan');

    // Buat record pembayaran baru
    const pembayaran = await this.prisma.pembayaranIpl.create({
      data: {
        idUser: data.idUser,
        idIpl: data.idIpl,
        nominal: data.nominal,
        buktiTransaksi: data.buktiTransaksi,
      },
    });

    // Update status IPL menjadi MENUNGGU_KONFIRMASI
    await this.prisma.ipl.update({
      where: { id: data.idIpl },
      data: { statusPembayaran: 'MENUNGGU_KONFIRMASI' },
    });

    await this.notifikasiService.kirimKeRole(
      ['ADMIN', 'PENGURUS'],
      'PEMBAYARAN_MASUK',
      'Bukti Pembayaran Baru',
      'Ada warga yang mengirim bukti pembayaran IPL, menunggu konfirmasi.',
      '/dashboard/iuran',
    );

    return { message: 'Bukti pembayaran berhasil dikirim. Menunggu konfirmasi admin.', data: pembayaran };
  }

  // ================================================================
  // USER / WARGA CRUD
  // ================================================================

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
              blokRumah: createWargaDto.blokRumah,
            },
          },
        },
      });
      return { message: 'Akun warga dan data rumah berhasil dibuat!', data: newUser };
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
      include: { rumah: true },
    });
  }

  /** Khusus untuk dropdown di form Tambah / Edit Rumah */
  async findAllUsers() {
    return this.prisma.user.findMany({
      where: { role: Role.WARGA },
      select: {
        id: true,
        namaUser: true,
        email: true,
        noTelp: true,
        _count: { select: { rumah: true } },
      },
      orderBy: { namaUser: 'asc' },
    });
  }

  async findOne(id: number) {
    const warga = await this.prisma.user.findFirst({
      where: { id, role: Role.WARGA },
      include: { rumah: true },
    });
    if (!warga) throw new NotFoundException(`Warga dengan ID ${id} tidak ditemukan`);
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
    return this.prisma.user.delete({ where: { id } });
  }

  // ================================================================
  // RUMAH CRUD
  // ================================================================

  async findAllRumah() {
    const rumahList = await this.prisma.rumah.findMany({
      include: {
        penghuni: {
          select: {
            id: true,
            namaUser: true,
            email: true,
            noTelp: true,
            // Hitung total rumah yang dimiliki user ini
            _count: { select: { rumah: true } },
          },
        },
      },
      orderBy: [{ rt: 'asc' }, { blokRumah: 'asc' }],
    });
    return rumahList;
  }

  async createRumah(dto: CreateRumahDto) {
    return this.prisma.rumah.create({
      data: {
        blokRumah: dto.blokRumah,
        rt: dto.rt,
        userId: dto.userId ?? null,
      },
      include: {
        penghuni: {
          select: { id: true, namaUser: true, email: true, noTelp: true },
        },
      },
    });
  }

  async updateRumah(id: number, dto: UpdateRumahDto) {
    const existing = await this.prisma.rumah.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`Rumah dengan ID ${id} tidak ditemukan`);

    return this.prisma.rumah.update({
      where: { id },
      data: {
        ...(dto.blokRumah !== undefined && { blokRumah: dto.blokRumah }),
        ...(dto.rt !== undefined && { rt: dto.rt }),
        // Allow setting userId ke null (kosongkan rumah) atau ke user lain
        ...(dto.userId !== undefined && { userId: dto.userId }),
      },
      include: {
        penghuni: {
          select: { id: true, namaUser: true, email: true, noTelp: true },
        },
      },
    });
  }

  async removeRumah(id: number) {
    const existing = await this.prisma.rumah.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`Rumah dengan ID ${id} tidak ditemukan`);
    return this.prisma.rumah.delete({ where: { id } });
  }
}