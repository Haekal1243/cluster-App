import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateKasDto } from './dto/create-kas.dto';
import { UpdateKasDto } from './dto/update-kas.dto';
import {
  currentYm,
  resolvePeriode,
  ymRangeToDates,
} from '../common/periode.helper';

@Injectable()
export class KeuanganService {
  constructor(private prisma: PrismaService) {}

  // ================================================================
  // CRUD TRANSAKSI KAS MANUAL
  // ================================================================

  async create(dto: CreateKasDto, file?: Express.Multer.File) {
    const data = await this.prisma.kasTransaksi.create({
      data: {
        tipe: dto.tipe,
        kategori: dto.kategori,
        nominal: dto.nominal,
        tanggal: new Date(dto.tanggal),
        keterangan: dto.keterangan ?? null,
        buktiFile: file?.filename ?? null,
        createBy: dto.createBy ?? null,
      },
    });
    return { message: 'Transaksi kas berhasil dicatat.', data };
  }

  async findAll(params: {
    dari?: string;
    sampai?: string;
    tipe?: string;
    kategori?: string;
    search?: string;
  }) {
    const { dari, sampai, tipe, kategori, search } = params;
    const and: any[] = [];

    const range = resolvePeriode(dari, sampai);
    if (range) {
      const { gte, lt } = ymRangeToDates(range.dariYm, range.sampaiYm);
      and.push({ tanggal: { gte, lt } });
    }
    if (tipe && tipe !== 'SEMUA') and.push({ tipe });
    if (kategori && kategori !== 'SEMUA') and.push({ kategori });
    if (search) {
      and.push({
        OR: [
          { kategori: { contains: search } },
          { keterangan: { contains: search } },
        ],
      });
    }

    const riwayat = await this.prisma.kasTransaksi.findMany({
      where: and.length > 0 ? { AND: and } : {},
      orderBy: [{ tanggal: 'desc' }, { id: 'desc' }],
    });
    return { riwayat };
  }

  async findOne(id: number) {
    const data = await this.prisma.kasTransaksi.findUnique({ where: { id } });
    if (!data) {
      throw new NotFoundException(`Transaksi kas dengan ID ${id} tidak ditemukan.`);
    }
    return data;
  }

  async update(id: number, dto: UpdateKasDto, file?: Express.Multer.File) {
    await this.findOne(id);
    const data = await this.prisma.kasTransaksi.update({
      where: { id },
      data: {
        ...(dto.tipe !== undefined && { tipe: dto.tipe }),
        ...(dto.kategori !== undefined && { kategori: dto.kategori }),
        ...(dto.nominal !== undefined && { nominal: dto.nominal }),
        ...(dto.tanggal !== undefined && { tanggal: new Date(dto.tanggal) }),
        ...(dto.keterangan !== undefined && { keterangan: dto.keterangan }),
        ...(file && { buktiFile: file.filename }),
      },
    });
    return { message: 'Transaksi kas berhasil diperbarui.', data };
  }

  async remove(id: number) {
    await this.findOne(id);
    await this.prisma.kasTransaksi.delete({ where: { id } });
    return { message: 'Transaksi kas berhasil dihapus.' };
  }

  // ================================================================
  // RINGKASAN — IPL otomatis (LUNAS) + kas manual
  // ================================================================

  async getRingkasan(params?: { dari?: string; sampai?: string }) {
    const ym = currentYm();
    const bulan = ym.slice(5);
    const tahun = ym.slice(0, 4);
    const resolved = resolvePeriode(params?.dari, params?.sampai) ?? {
      periodeList: [{ bulan, tahun, label: '' }],
      periodeOr: [{ bulanPeriode: bulan, tahunPeriode: tahun }],
      dariYm: ym,
      sampaiYm: ym,
    };
    const { gte, lt } = ymRangeToDates(resolved.dariYm, resolved.sampaiYm);

    const [iplLunas, kasPeriode, kasSemua, iplSemua] = await Promise.all([
      // Pemasukan IPL otomatis dalam periode
      this.prisma.ipl.findMany({
        where: { OR: resolved.periodeOr, statusPembayaran: 'LUNAS' },
        select: { nominal: true },
      }),
      this.prisma.kasTransaksi.findMany({
        where: { tanggal: { gte, lt } },
        select: { tipe: true, kategori: true, nominal: true },
      }),
      this.prisma.kasTransaksi.findMany({
        select: { tipe: true, nominal: true },
      }),
      this.prisma.ipl.findMany({
        where: { statusPembayaran: 'LUNAS' },
        select: { nominal: true },
      }),
    ]);

    const sum = (rows: { nominal: number }[]) =>
      rows.reduce((s, r) => s + r.nominal, 0);

    const pemasukanIpl = sum(iplLunas);
    const pemasukanManual = sum(
      kasPeriode.filter((t) => t.tipe === 'PEMASUKAN'),
    );
    const totalPemasukan = pemasukanIpl + pemasukanManual;
    const totalPengeluaran = sum(
      kasPeriode.filter((t) => t.tipe === 'PENGELUARAN'),
    );

    // Breakdown per kategori dalam periode
    const perKategori: Record<string, Record<string, number>> = {
      PEMASUKAN: { IPL: pemasukanIpl },
      PENGELUARAN: {},
    };
    for (const t of kasPeriode) {
      const bucket = perKategori[t.tipe];
      bucket[t.kategori] = (bucket[t.kategori] ?? 0) + t.nominal;
    }

    // Saldo kas saat ini (kumulatif sepanjang waktu)
    const saldoKas =
      sum(iplSemua) +
      sum(kasSemua.filter((t) => t.tipe === 'PEMASUKAN')) -
      sum(kasSemua.filter((t) => t.tipe === 'PENGELUARAN'));

    return {
      periode: {
        dari: resolved.dariYm,
        sampai: resolved.sampaiYm,
        jumlahBulan: resolved.periodeList.length,
      },
      pemasukanIpl: { total: pemasukanIpl, jumlahTagihan: iplLunas.length },
      pemasukanManual,
      totalPemasukan,
      totalPengeluaran,
      saldoPeriode: totalPemasukan - totalPengeluaran,
      saldoKas,
      perKategori,
    };
  }
}
