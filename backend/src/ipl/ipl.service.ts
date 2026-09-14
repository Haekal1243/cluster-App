import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GenerateIplDto } from './dto/generate-ipl.dto';
import { KonfirmasiIplDto } from './dto/konfirmasi-ipl.dto';

@Injectable()
export class IplService {
  constructor(private prisma: PrismaService) {}

  // ================================================================
  // GENERATE TAGIHAN MASSAL
  // ================================================================

  async generateTagihan(dto: GenerateIplDto) {
    const { bulanPeriode, tahunPeriode, nominal } = dto;

    // Ambil semua rumah yang aktif (dihuni = userId != null)
    const rumahAktif = await this.prisma.rumah.findMany({
      where: { userId: { not: null } },
      select: { id: true, blokRumah: true, rt: true },
    });

    if (rumahAktif.length === 0) {
      throw new BadRequestException('Tidak ada rumah aktif yang ditemukan.');
    }

    // Cek apakah tagihan periode ini sudah ada untuk salah satu rumah
    const existing = await this.prisma.ipl.findFirst({
      where: {
        bulanPeriode,
        tahunPeriode,
        idRumah: { in: rumahAktif.map((r) => r.id) },
      },
    });

    if (existing) {
      throw new BadRequestException(
        `Tagihan untuk periode ${bulanPeriode}/${tahunPeriode} sudah pernah digenerate.`,
      );
    }

    // Batch create tagihan untuk semua rumah aktif
    await this.prisma.ipl.createMany({
      data: rumahAktif.map((rumah) => ({
        idRumah: rumah.id,
        bulanPeriode,
        tahunPeriode,
        nominal,
      })),
    });

    return {
      message: `Berhasil generate ${rumahAktif.length} tagihan IPL untuk periode ${bulanPeriode}/${tahunPeriode}.`,
      jumlahTagihan: rumahAktif.length,
      nominal,
      periode: `${bulanPeriode}/${tahunPeriode}`,
    };
  }

  // ================================================================
  // GET ALL TAGIHAN (dengan filter)
  // ================================================================

  async findAll(params: {
    bulan?: string;
    tahun?: string;
    status?: string;
    search?: string;
  }) {
    const { bulan, tahun, status, search } = params;

    const where: any = {};
    if (bulan) where.bulanPeriode = bulan;
    if (tahun) where.tahunPeriode = tahun;
    if (status && status !== 'SEMUA') where.statusPembayaran = status;
    if (search) {
      where.OR = [
        { rumah: { blokRumah: { contains: search } } },
        { rumah: { penghuni: { namaUser: { contains: search } } } },
      ];
    }

    const tagihan = await this.prisma.ipl.findMany({
      where,
      include: {
        rumah: {
          include: {
            penghuni: {
              select: { id: true, namaUser: true, email: true, noTelp: true },
            },
          },
        },
        pembayaran: {
          orderBy: { tanggalBayar: 'desc' },
          take: 1,
          select: {
            idPembayaran: true,
            buktiTransaksi: true,
            tanggalBayar: true,
            nominal: true,
            catatan: true,
          },
        },
      },
      orderBy: [
        { tahunPeriode: 'desc' },
        { bulanPeriode: 'desc' },
        { rumah: { rt: 'asc' } },
        { rumah: { blokRumah: 'asc' } },
      ],
    });

    // Hitung summary metrics
    const summary = {
      total: tagihan.length,
      lunas: tagihan.filter((t) => t.statusPembayaran === 'LUNAS').length,
      belumLunas: tagihan.filter((t) => t.statusPembayaran === 'BELUM_LUNAS')
        .length,
      menungguKonfirmasi: tagihan.filter(
        (t) => t.statusPembayaran === 'MENUNGGU_KONFIRMASI',
      ).length,
      totalNominal: tagihan.reduce((sum, t) => sum + t.nominal, 0),
      totalTerkumpul: tagihan
        .filter((t) => t.statusPembayaran === 'LUNAS')
        .reduce((sum, t) => sum + t.nominal, 0),
      totalTertunggak: tagihan
        .filter((t) => t.statusPembayaran !== 'LUNAS')
        .reduce((sum, t) => sum + t.nominal, 0),
    };

    return { tagihan, summary };
  }

  // ================================================================
  // DASHBOARD STATS — ringkasan bulan berjalan
  // ================================================================

  async getDashboardStats() {
    const now = new Date();
    const bulanIni = String(now.getMonth() + 1).padStart(2, '0');
    const tahunIni = String(now.getFullYear());

    // Bangun data 6 bulan terakhir untuk tren chart
    const bulan6 = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      return {
        bulan: String(d.getMonth() + 1).padStart(2, '0'),
        tahun: String(d.getFullYear()),
        label: d.toLocaleDateString('id-ID', { month: 'short', year: '2-digit' }),
      };
    });

    const [tagihanBulanIni, totalWarga, menungguKonfirmasi, pembayaranTerbaru] =
      await Promise.all([
        this.prisma.ipl.findMany({
          where: { bulanPeriode: bulanIni, tahunPeriode: tahunIni },
          select: { statusPembayaran: true, nominal: true },
        }),
        this.prisma.user.count({ where: { role: 'WARGA' } }),
        this.prisma.ipl.count({
          where: { statusPembayaran: 'MENUNGGU_KONFIRMASI' },
        }),
        // 5 pembayaran terbaru yang di-upload warga
        this.prisma.pembayaranIpl.findMany({
          orderBy: { tanggalBayar: 'desc' },
          take: 5,
          select: {
            idPembayaran: true,
            tanggalBayar: true,
            nominal: true,
            buktiTransaksi: true,
            user: { select: { namaUser: true } },
            ipl: {
              select: {
                bulanPeriode: true,
                tahunPeriode: true,
                statusPembayaran: true,
                rumah: { select: { blokRumah: true, rt: true } },
              },
            },
          },
        }),
      ]);

    // Hitung kas masuk & ringkasan bulan ini
    const lunasBulanIni = tagihanBulanIni.filter(
      (t) => t.statusPembayaran === 'LUNAS',
    ).length;
    const belumLunasBulanIni = tagihanBulanIni.filter(
      (t) => t.statusPembayaran !== 'LUNAS',
    ).length;     const totalKasMasukBulanIni = tagihanBulanIni
      .filter((t) => t.statusPembayaran === 'LUNAS')
      .reduce((sum, t) => sum + t.nominal, 0);

    // Hitung tren kas masuk 6 bulan terakhir
    const trenData = await Promise.all(
      bulan6.map(async ({ bulan, tahun, label }) => {
        const rows = await this.prisma.ipl.findMany({
          where: { bulanPeriode: bulan, tahunPeriode: tahun, statusPembayaran: 'LUNAS' },
          select: { nominal: true },
        });
        return {
          label,
          bulan,
          tahun,
          kasMasuk: rows.reduce((sum, r) => sum + r.nominal, 0),
          jumlahLunas: rows.length,
        };
      }),
    );

    return {
      totalWarga,
      lunasBulanIni,
      belumLunasBulanIni,
      menungguKonfirmasi,
      totalTagihanBulanIni: tagihanBulanIni.length,
      totalKasMasukBulanIni,
      bulanIni,
      tahunIni,
      trenPemasukan: trenData,
      pembayaranTerbaru,
    };
  }


  // ================================================================
  // KONFIRMASI / TOLAK PEMBAYARAN
  // ================================================================

  async konfirmasiPembayaran(pembayaranId: number, dto: KonfirmasiIplDto) {
    // Cari record pembayaran
    const pembayaran = await this.prisma.pembayaranIpl.findUnique({
      where: { idPembayaran: pembayaranId },
      include: { ipl: true },
    });

    if (!pembayaran) {
      throw new NotFoundException(
        `Pembayaran dengan ID ${pembayaranId} tidak ditemukan.`,
      );
    }

    if (pembayaran.ipl.statusPembayaran !== 'MENUNGGU_KONFIRMASI') {
      throw new BadRequestException(
        'Pembayaran ini tidak dalam status "Menunggu Konfirmasi".',
      );
    }

    if (dto.action === 'TERIMA') {
      // Update status IPL ke LUNAS
      await this.prisma.ipl.update({
        where: { id: pembayaran.idIpl },
        data: { statusPembayaran: 'LUNAS' },
      });

      return { message: 'Pembayaran berhasil dikonfirmasi. Status menjadi LUNAS.' };
    } else {
      // TOLAK: kembalikan status ke BELUM_LUNAS + simpan catatan
      await Promise.all([
        this.prisma.ipl.update({
          where: { id: pembayaran.idIpl },
          data: { statusPembayaran: 'BELUM_LUNAS' },
        }),
        this.prisma.pembayaranIpl.update({
          where: { idPembayaran: pembayaranId },
          data: { catatan: dto.catatan ?? null },
        }),
      ]);

      return {
        message: 'Pembayaran ditolak. Status dikembalikan ke BELUM LUNAS.',
        catatan: dto.catatan ?? null,
      };
    }
  }
}
