import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Area, Prisma, RT } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateKasDto } from './dto/create-kas.dto';
import { UpdateKasDto } from './dto/update-kas.dto';
import { AccessContext } from '../auth/auth.types';
import { areaFilter, assertInArea } from '../common/scope.helper';
import {
  currentYm,
  resolvePeriode,
  ymRangeToDates,
} from '../common/periode.helper';

const SEMUA_AREA: Area[] = ['RW', 'RT_01', 'RT_02', 'RT_03', 'RT_04'];

const sum = (rows: { nominal: number }[]) => rows.reduce((s, r) => s + r.nominal, 0);

@Injectable()
export class KeuanganService {
  constructor(private prisma: PrismaService) {}

  /** Area yang datanya ikut dihitung/ditampilkan oleh user ini. */
  private areasFor(ctx: AccessContext, pilih?: string): Area[] {
    const area = areaFilter(ctx);
    if (area) return [area];
    if (pilih && (SEMUA_AREA as string[]).includes(pilih)) return [pilih as Area];
    return SEMUA_AREA;
  }

  // ================================================================
  // CRUD TRANSAKSI KAS MANUAL
  // ================================================================

  async create(ctx: AccessContext, dto: CreateKasDto, file?: Express.Multer.File) {
    // Pengurus menulis ke kas area-nya sendiri; hanya scope ALL yang boleh memilih area.
    const scopeArea = areaFilter(ctx);
    const area = scopeArea ?? dto.area ?? 'RW';

    const data = await this.prisma.kasTransaksi.create({
      data: {
        tipe: dto.tipe,
        area,
        kategori: dto.kategori,
        nominal: dto.nominal,
        tanggal: new Date(dto.tanggal),
        keterangan: dto.keterangan ?? null,
        buktiFile: file?.filename ?? null,
        createBy: ctx.user.nama,
      },
    });
    return { message: 'Transaksi kas berhasil dicatat.', data };
  }

  async findAll(
    ctx: AccessContext,
    params: {
      dari?: string;
      sampai?: string;
      tipe?: string;
      kategori?: string;
      search?: string;
      area?: string;
    },
  ) {
    const { dari, sampai, tipe, kategori, search, area } = params;
    const and: Prisma.KasTransaksiWhereInput[] = [
      { area: { in: this.areasFor(ctx, area) } },
    ];

    const range = resolvePeriode(dari, sampai);
    if (range) {
      const { gte, lt } = ymRangeToDates(range.dariYm, range.sampaiYm);
      and.push({ tanggal: { gte, lt } });
    }
    if (tipe && tipe !== 'SEMUA') and.push({ tipe: tipe as any });
    if (kategori && kategori !== 'SEMUA') and.push({ kategori });
    if (search) {
      and.push({
        OR: [{ kategori: { contains: search } }, { keterangan: { contains: search } }],
      });
    }

    const riwayat = await this.prisma.kasTransaksi.findMany({
      where: { AND: and },
      orderBy: [{ tanggal: 'desc' }, { id: 'desc' }],
    });
    return { riwayat };
  }

  async findOne(ctx: AccessContext, id: number) {
    const data = await this.prisma.kasTransaksi.findUnique({ where: { id } });
    if (!data) {
      throw new NotFoundException(`Transaksi kas dengan ID ${id} tidak ditemukan.`);
    }
    if (!this.areasFor(ctx).includes(data.area)) {
      throw new ForbiddenException('Transaksi ini di luar wilayah Anda.');
    }
    return data;
  }

  /** Untuk ubah/hapus, hak tulis dicek terhadap scope permission update/delete. */
  private async findForWrite(ctx: AccessContext, id: number) {
    const data = await this.prisma.kasTransaksi.findUnique({ where: { id } });
    if (!data) {
      throw new NotFoundException(`Transaksi kas dengan ID ${id} tidak ditemukan.`);
    }
    assertInArea(ctx, data.area);
    return data;
  }

  async update(ctx: AccessContext, id: number, dto: UpdateKasDto, file?: Express.Multer.File) {
    await this.findForWrite(ctx, id);
    const scopeArea = areaFilter(ctx);
    if (dto.area && scopeArea) assertInArea(ctx, dto.area);

    const data = await this.prisma.kasTransaksi.update({
      where: { id },
      data: {
        ...(dto.tipe !== undefined && { tipe: dto.tipe }),
        ...(dto.kategori !== undefined && { kategori: dto.kategori }),
        ...(dto.nominal !== undefined && { nominal: dto.nominal }),
        ...(dto.tanggal !== undefined && { tanggal: new Date(dto.tanggal) }),
        ...(dto.keterangan !== undefined && { keterangan: dto.keterangan }),
        ...(dto.area !== undefined && { area: dto.area }),
        ...(file && { buktiFile: file.filename }),
        updatedAt: new Date(),
      },
    });
    return { message: 'Transaksi kas berhasil diperbarui.', data };
  }

  async remove(ctx: AccessContext, id: number) {
    await this.findForWrite(ctx, id);
    await this.prisma.kasTransaksi.delete({ where: { id } });
    return { message: 'Transaksi kas berhasil dihapus.' };
  }

  // ================================================================
  // RINGKASAN
  //   Pemasukan otomatis (tidak disimpan di trx_kas):
  //     RT -> nominalKas dari tagihan LUNAS di RT itu
  //     RW -> totalIpl dari setoran RT yang sudah DIKONFIRMASI
  //   + kas manual per area. Porsi IPL yang sudah lunas tapi belum
  //   dikonfirmasi RW dilaporkan terpisah sebagai `titipanIpl`.
  // ================================================================

  async getRingkasan(
    ctx: AccessContext,
    params?: { dari?: string; sampai?: string; area?: string },
  ) {
    const areas = this.areasFor(ctx, params?.area);
    const rtDipilih = areas.filter((a): a is RT => a !== 'RW');
    const rwDipilih = areas.includes('RW');

    const ym = currentYm();
    const resolved = resolvePeriode(params?.dari, params?.sampai) ?? {
      periodeList: [{ bulan: ym.slice(5), tahun: ym.slice(0, 4), label: '' }],
      periodeOr: [{ bulanPeriode: ym.slice(5), tahunPeriode: ym.slice(0, 4) }],
      dariYm: ym,
      sampaiYm: ym,
    };
    const { gte, lt } = ymRangeToDates(resolved.dariYm, resolved.sampaiYm);

    // Query selalu dijalankan; filter kosong (`in: []`) otomatis menghasilkan 0 baris,
    // jadi tidak perlu cabang khusus ketika area RT atau RW tidak dipilih.
    const tanpaRw = { id: { in: [] as number[] } };
    const rtSaja = { rumah: { rt: { in: rtDipilih } } };

    const [kasRtPeriode, kasRtSemua, setoranPeriode, setoranSemua, kasPeriode, kasSemua, titipan] =
      await Promise.all([
        // Kas RT yang terkumpul pada periode tagihan
        this.prisma.ipl.findMany({
          where: { OR: resolved.periodeOr, statusPembayaran: 'LUNAS', ...rtSaja },
          select: { nominalKas: true, bulanPeriode: true, tahunPeriode: true, rumah: { select: { rt: true } } },
        }),
        this.prisma.ipl.findMany({
          where: { statusPembayaran: 'LUNAS', ...rtSaja },
          select: { nominalKas: true },
        }),
        // Setoran RT yang dikonfirmasi RW menjadi pemasukan kas RW
        this.prisma.setoranIpl.findMany({
          where: { status: 'DIKONFIRMASI', tanggalKonfirmasi: { gte, lt }, ...(!rwDipilih && tanpaRw) },
          select: { totalIpl: true, area: true, tanggalKonfirmasi: true },
        }),
        this.prisma.setoranIpl.findMany({
          where: { status: 'DIKONFIRMASI', ...(!rwDipilih && tanpaRw) },
          select: { totalIpl: true },
        }),
        this.prisma.kasTransaksi.findMany({
          where: { area: { in: areas }, tanggal: { gte, lt } },
          select: { tipe: true, kategori: true, nominal: true, tanggal: true, area: true },
        }),
        this.prisma.kasTransaksi.findMany({
          where: { area: { in: areas } },
          select: { tipe: true, nominal: true },
        }),
        // Porsi IPL yang dipegang RT: lunas tapi setorannya belum dikonfirmasi RW
        this.prisma.ipl.findMany({
          where: {
            statusPembayaran: 'LUNAS',
            ...rtSaja,
            OR: [{ setoranId: null }, { setoran: { status: { not: 'DIKONFIRMASI' } } }],
          },
          select: { nominalIpl: true },
        }),
      ]);

    const kasRtTotal = kasRtPeriode.reduce((s, r) => s + r.nominalKas, 0);
    const setoranTotal = setoranPeriode.reduce((s, r) => s + r.totalIpl, 0);
    const pemasukanOtomatis = kasRtTotal + setoranTotal;
    const pemasukanManual = sum(kasPeriode.filter((t) => t.tipe === 'PEMASUKAN'));
    const totalPemasukan = pemasukanOtomatis + pemasukanManual;
    const totalPengeluaran = sum(kasPeriode.filter((t) => t.tipe === 'PENGELUARAN'));

    // Breakdown per kategori dalam periode
    const perKategori: Record<string, Record<string, number>> = {
      PEMASUKAN: {},
      PENGELUARAN: {},
    };
    if (kasRtTotal) perKategori.PEMASUKAN['Kas RT (dari IPL warga)'] = kasRtTotal;
    if (setoranTotal) perKategori.PEMASUKAN['Setoran IPL RT'] = setoranTotal;
    for (const t of kasPeriode) {
      const bucket = perKategori[t.tipe];
      bucket[t.kategori] = (bucket[t.kategori] ?? 0) + t.nominal;
    }

    // Saldo kas saat ini (kumulatif sepanjang waktu)
    const saldoKas =
      kasRtSemua.reduce((s, r) => s + r.nominalKas, 0) +
      setoranSemua.reduce((s, r) => s + r.totalIpl, 0) +
      sum(kasSemua.filter((t) => t.tipe === 'PEMASUKAN')) -
      sum(kasSemua.filter((t) => t.tipe === 'PENGELUARAN'));

    // Tren arus kas per bulan dalam rentang
    const ymKey = (tanggal: Date) =>
      `${tanggal.getFullYear()}-${String(tanggal.getMonth() + 1).padStart(2, '0')}`;
    const tren = resolved.periodeList.map(({ bulan, tahun, label }) => {
      const key = `${tahun}-${bulan}`;
      const kasBulanIni = kasRtPeriode
        .filter((t) => t.bulanPeriode === bulan && t.tahunPeriode === tahun)
        .reduce((s, t) => s + t.nominalKas, 0);
      const setoranBulanIni = setoranPeriode
        .filter((s) => s.tanggalKonfirmasi && ymKey(s.tanggalKonfirmasi) === key)
        .reduce((s, r) => s + r.totalIpl, 0);
      const manualBulan = kasPeriode.filter((t) => ymKey(t.tanggal) === key);
      return {
        label,
        bulan,
        tahun,
        pemasukan:
          kasBulanIni + setoranBulanIni + sum(manualBulan.filter((t) => t.tipe === 'PEMASUKAN')),
        pengeluaran: sum(manualBulan.filter((t) => t.tipe === 'PENGELUARAN')),
      };
    });

    // Rincian per area supaya ketua RW bisa membandingkan RW dan tiap RT
    const perArea = areas.map((area) => {
      const manual = kasPeriode.filter((t) => t.area === area);
      const otomatis =
        area === 'RW'
          ? setoranTotal
          : kasRtPeriode.filter((r) => r.rumah.rt === area).reduce((s, r) => s + r.nominalKas, 0);
      const pemasukan = otomatis + sum(manual.filter((t) => t.tipe === 'PEMASUKAN'));
      const pengeluaran = sum(manual.filter((t) => t.tipe === 'PENGELUARAN'));
      return { area, pemasukan, pengeluaran, saldo: pemasukan - pengeluaran };
    });

    return {
      areas,
      periode: {
        dari: resolved.dariYm,
        sampai: resolved.sampaiYm,
        jumlahBulan: resolved.periodeList.length,
      },
      pemasukanOtomatis: {
        total: pemasukanOtomatis,
        kasRt: kasRtTotal,
        setoranIpl: setoranTotal,
      },
      pemasukanManual,
      totalPemasukan,
      totalPengeluaran,
      saldoPeriode: totalPemasukan - totalPengeluaran,
      saldoKas,
      titipanIpl: titipan.reduce((s, r) => s + r.nominalIpl, 0),
      perKategori,
      perArea,
      tren,
    };
  }
}
