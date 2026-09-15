import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GenerateIplDto } from './dto/generate-ipl.dto';
import { KonfirmasiIplDto } from './dto/konfirmasi-ipl.dto';
import { NotifikasiService } from '../notifikasi/notifikasi.service';
import { resolvePeriode } from '../common/periode.helper';

@Injectable()
export class IplService {
  constructor(
    private prisma: PrismaService,
    private notifikasiService: NotifikasiService,
  ) {}

  // ================================================================
  // GENERATE TAGIHAN MASSAL
  // ================================================================

  async generateTagihan(dto: GenerateIplDto) {
    const { bulanPeriode, tahunPeriode, nominal } = dto;

    // Ambil semua rumah yang aktif (dihuni = userId != null)
    const rumahAktif = await this.prisma.rumah.findMany({
      where: { userId: { not: null } },
      select: { id: true, blokRumah: true, rt: true, userId: true },
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

    const idUserList = rumahAktif
      .map((r) => r.userId)
      .filter((id): id is number => id !== null);
    await this.notifikasiService.kirimBanyak(
      idUserList,
      'TAGIHAN_BARU',
      'Tagihan IPL Baru',
      `Tagihan IPL periode ${bulanPeriode}/${tahunPeriode} sebesar Rp ${nominal.toLocaleString('id-ID')} telah diterbitkan.`,
      '/dashboard/iuran',
    );

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
    dari?: string;
    sampai?: string;
    status?: string;
    search?: string;
  }) {
    const { bulan, tahun, dari, sampai, status, search } = params;

    const and: any[] = [];
    const range = resolvePeriode(dari, sampai);
    if (range) {
      // Range diutamakan bila diberikan
      and.push({ OR: range.periodeOr });
    } else {
      if (bulan) and.push({ bulanPeriode: bulan });
      if (tahun) and.push({ tahunPeriode: tahun });
    }
    if (status && status !== 'SEMUA') and.push({ statusPembayaran: status });
    if (search) {
      and.push({
        OR: [
          { rumah: { blokRumah: { contains: search } } },
          { rumah: { penghuni: { namaUser: { contains: search } } } },
        ],
      });
    }
    const where = and.length > 0 ? { AND: and } : {};

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
  // DASHBOARD STATS — ringkasan per rentang periode (maks 12 bulan)
  // Query: ?dari=YYYY-MM&sampai=YYYY-MM. Tanpa param = bulan berjalan.
  // ================================================================

  async getDashboardStats(params?: { dari?: string; sampai?: string }) {
    const now = new Date();
    const bulanIni = String(now.getMonth() + 1).padStart(2, '0');
    const tahunIni = String(now.getFullYear());

    const resolved = resolvePeriode(params?.dari, params?.sampai);
    // Default: bulan berjalan (backward-compatible)
    const periodeList = resolved?.periodeList ?? [
      {
        bulan: bulanIni,
        tahun: tahunIni,
        label: new Date(now.getFullYear(), now.getMonth(), 1).toLocaleDateString(
          'id-ID',
          { month: 'short', year: '2-digit' },
        ),
      },
    ];

    const periodeOr = resolved?.periodeOr ??
      periodeList.map((p) => ({
        bulanPeriode: p.bulan,
        tahunPeriode: p.tahun,
      }));

    const [tagihanPeriode, totalWarga, menungguKonfirmasi, pembayaranTerbaru] =
      await Promise.all([
        this.prisma.ipl.findMany({
          where: { OR: periodeOr },
          select: { statusPembayaran: true, nominal: true },
        }),
        this.prisma.user.count({ where: { role: 'WARGA' } }),
        this.prisma.ipl.count({
          where: { statusPembayaran: 'MENUNGGU_KONFIRMASI', OR: periodeOr },
        }),
        // 5 pembayaran terbaru yang tagihannya masuk rentang periode
        this.prisma.pembayaranIpl.findMany({
          where: { ipl: { OR: periodeOr } },
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

    // Hitung kas masuk & ringkasan periode
    const lunasBulanIni = tagihanPeriode.filter(
      (t) => t.statusPembayaran === 'LUNAS',
    ).length;
    const belumLunasBulanIni = tagihanPeriode.filter(
      (t) => t.statusPembayaran !== 'LUNAS',
    ).length;
    const totalKasMasukBulanIni = tagihanPeriode
      .filter((t) => t.statusPembayaran === 'LUNAS')
      .reduce((sum, t) => sum + t.nominal, 0);

    // Tren kas masuk mengikuti rentang periode yang dipilih
    const trenData = await Promise.all(
      periodeList.map(async ({ bulan, tahun, label }) => {
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

    const dariYm = `${periodeList[0].tahun}-${periodeList[0].bulan}`;
    const sampaiYm = `${periodeList[periodeList.length - 1].tahun}-${periodeList[periodeList.length - 1].bulan}`;

    return {
      totalWarga,
      lunasBulanIni,
      belumLunasBulanIni,
      menungguKonfirmasi,
      totalTagihanBulanIni: tagihanPeriode.length,
      totalKasMasukBulanIni,
      bulanIni,
      tahunIni,
      periode: { dari: dariYm, sampai: sampaiYm, jumlahBulan: periodeList.length },
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

      await this.notifikasiService.kirim(
        pembayaran.idUser,
        'PEMBAYARAN_DIKONFIRMASI',
        'Pembayaran Dikonfirmasi',
        'Pembayaran IPL kamu sudah dikonfirmasi dan berstatus Lunas.',
        '/dashboard/iuran',
      );

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

      await this.notifikasiService.kirim(
        pembayaran.idUser,
        'PEMBAYARAN_DITOLAK',
        'Pembayaran Ditolak',
        `Pembayaran IPL kamu ditolak.${dto.catatan ? ` Catatan: ${dto.catatan}` : ''}`,
        '/dashboard/iuran',
      );

      return {
        message: 'Pembayaran ditolak. Status dikembalikan ke BELUM LUNAS.',
        catatan: dto.catatan ?? null,
      };
    }
  }
}
