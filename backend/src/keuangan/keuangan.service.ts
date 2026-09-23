import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Area, Prisma, RT } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
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
    const areas = this.areasFor(ctx, area);
    const rtDipilih = areas.filter((a): a is RT => a !== 'RW');
    const rwDipilih = areas.includes('RW');

    const and: Prisma.KasTransaksiWhereInput[] = [{ area: { in: areas } }];

    const range = resolvePeriode(dari, sampai);
    let gte: Date | undefined;
    let lt: Date | undefined;
    if (range) {
      const d = ymRangeToDates(range.dariYm, range.sampaiYm);
      gte = d.gte;
      lt = d.lt;
      and.push({ tanggal: { gte, lt } });
    }
    if (tipe && tipe !== 'SEMUA') and.push({ tipe: tipe as any });
    // kategori filter hanya untuk manual (sesuai klarifikasi: otomatis cukup filter pemasukan)
    if (kategori && kategori !== 'SEMUA') and.push({ kategori });
    if (search) {
      and.push({
        OR: [{ kategori: { contains: search } }, { keterangan: { contains: search } }],
      });
    }

    const manualRows = await this.prisma.kasTransaksi.findMany({
      where: { AND: and },
      orderBy: [{ tanggal: 'desc' }, { id: 'desc' }],
    });

    // Pemasukan otomatis agregat per bulan (bukan per transaksi) — 1 baris/bulan
    const autoRows: any[] = [];
    const isPemasukanFilter = !tipe || tipe === 'SEMUA' || tipe === 'PEMASUKAN';
    // kategori filter diabaikan untuk otomatis (klarifikasi 3)
    if (isPemasukanFilter && rtDipilih.length > 0) {
      const whereIpl: Prisma.IplWhereInput = {
        statusPembayaran: 'LUNAS',
        rumah: { rt: { in: rtDipilih } },
      };
      if (range) (whereIpl as any).OR = range.periodeOr;

      const iplRows = await this.prisma.ipl.findMany({
        where: whereIpl,
        select: {
          nominalKas: true,
          bulanPeriode: true,
          tahunPeriode: true,
          rumah: { select: { rt: true } },
          pembayaran: {
            select: { tanggalKonfirmasi: true },
            orderBy: { tanggalKonfirmasi: 'desc' },
            take: 1,
          },
        },
      });

      // group by RT + period (YYYY-MM) -> 1 baris/bulan/RT
      const BULAN_LABEL: Record<string, string> = { "01":"Jan","02":"Feb","03":"Mar","04":"Apr","05":"Mei","06":"Jun","07":"Jul","08":"Agu","09":"Sep","10":"Okt","11":"Nov","12":"Des" };
      const groups = new Map<string, { rt: RT; bulan:string; tahun:string; total:number; count:number; latest: Date | null }>();
      for (const r of iplRows) {
        const key = `${r.rumah.rt}-${r.tahunPeriode}-${r.bulanPeriode}`;
        const g = groups.get(key) ?? { rt: r.rumah.rt, bulan: r.bulanPeriode, tahun: r.tahunPeriode, total:0, count:0, latest:null };
        g.total += r.nominalKas;
        g.count += 1;
        const t = r.pembayaran[0]?.tanggalKonfirmasi ?? null;
        if (t && (!g.latest || t > g.latest)) g.latest = t;
        groups.set(key, g);
      }
      for (const [key, g] of groups) {
        if (g.total === 0) continue;
        const label = `${BULAN_LABEL[g.bulan]||g.bulan} ${g.tahun}`;
        const keterangan = `Kas RT (${label})`;
        const searchOk = !search || `${keterangan} Kas RT (dari IPL warga) ${g.rt} ${label}`.toLowerCase().includes(search.toLowerCase());
        if (!searchOk) continue;
        // tanggal = latest konfirmasi dalam bulan itu, fallback ke tgl 15 bulan tersebut
        const tanggal = g.latest ?? new Date(Number(g.tahun), Number(g.bulan)-1, 15);
        autoRows.push({
          id: `ipl-${key}`,
          tipe: 'PEMASUKAN',
          area: g.rt as Area,
          kategori: 'Kas RT (dari IPL warga)',
          nominal: g.total,
          tanggal,
          keterangan,
          buktiFile: null,
          sumber: 'IPL_KAS' as const,
          locked: false,
        });
      }
    }

    if (isPemasukanFilter && rwDipilih) {
      const whereSetoran: Prisma.SetoranIplWhereInput = {
        status: 'DIKONFIRMASI',
        tanggalKonfirmasi: gte && lt ? { gte, lt } : { not: null } as any,
      };
      if (!gte) whereSetoran.tanggalKonfirmasi = { not: null } as any;
      const setoranRows = await this.prisma.setoranIpl.findMany({
        where: whereSetoran,
        select: {
          totalIpl: true,
          tanggalKonfirmasi: true,
        },
      });
      // group setoran per bulan konfirmasi (YYYY-MM) -> 1 baris/bulan
      const sGroups = new Map<string, { total:number; count:number; latest: Date|null; ym:string }>();
      for (const s of setoranRows) {
        if (!s.tanggalKonfirmasi) continue;
        const d = s.tanggalKonfirmasi;
        const ym = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
        const g = sGroups.get(ym) ?? { total:0, count:0, latest:null, ym };
        g.total += s.totalIpl;
        g.count += 1;
        if (!g.latest || d > g.latest) g.latest = d;
        sGroups.set(ym, g);
      }
      for (const [ym, g] of sGroups) {
        const [y,m] = ym.split('-');
        const label = `${({"01":"Jan","02":"Feb","03":"Mar","04":"Apr","05":"Mei","06":"Jun","07":"Jul","08":"Agu","09":"Sep","10":"Okt","11":"Nov","12":"Des"} as any)[m]||m} ${y}`;
        const keterangan = `Setoran IPL ${g.count} setoran - ${label}`;
        const searchOk = !search || `${keterangan} Setoran IPL RT`.toLowerCase().includes(search.toLowerCase());
        if (!searchOk) continue;
        autoRows.push({
          id: `setoran-${ym}`,
          tipe: 'PEMASUKAN',
          area: 'RW' as Area,
          kategori: 'Setoran IPL RT',
          nominal: g.total,
          tanggal: g.latest!,
          keterangan,
          buktiFile: null,
          sumber: 'SETORAN' as const,
          locked: true,
        });
      }
    }

    const riwayat = [...manualRows.map((r) => ({ ...r, sumber: 'MANUAL' as const, locked: false })), ...autoRows].sort((a, b) => {
      const ta = new Date(a.tanggal).getTime();
      const tb = new Date(b.tanggal).getTime();
      if (tb !== ta) return tb - ta;
      return String(b.id).localeCompare(String(a.id));
    });

    return { riwayat };
  }

  async findOne(ctx: AccessContext, id: string | number) {
    const sid = String(id);
    if (sid.startsWith('ipl-') || sid.startsWith('setoran-')) {
      // Virtual row — kembalikan representasi untuk modal read
      return { id: sid, virtual: true } as any;
    }
    const nid = Number(id);
    const data = await this.prisma.kasTransaksi.findUnique({ where: { id: nid } });
    if (!data) {
      throw new NotFoundException(`Transaksi kas dengan ID ${id} tidak ditemukan.`);
    }
    if (!this.areasFor(ctx).includes(data.area)) {
      throw new ForbiddenException('Transaksi ini di luar wilayah Anda.');
    }
    return data;
  }

  /** Path file bukti transaksi kas; dicek scope dulu, folder ini tidak disajikan statis. */
  async filePathBukti(ctx: AccessContext, id: string | number) {
    const data = await this.findOne(ctx, id);
    if (data.virtual || !data.buktiFile) {
      throw new NotFoundException('Transaksi ini tidak memiliki bukti file.');
    }
    const full = path.join(process.cwd(), 'uploads', 'keuangan', data.buktiFile);
    if (!fs.existsSync(full)) throw new NotFoundException('File bukti tidak ditemukan.');
    return full;
  }

  /** Untuk ubah/hapus, hak tulis dicek terhadap scope permission update/delete. */
  private async findForWrite(ctx: AccessContext, id: string | number) {
    const sid = String(id);
    if (sid.startsWith('ipl-') || sid.startsWith('setoran-')) return { virtual: true, sid } as any;
    const nid = Number(id);
    const data = await this.prisma.kasTransaksi.findUnique({ where: { id: nid } });
    if (!data) {
      throw new NotFoundException(`Transaksi kas dengan ID ${id} tidak ditemukan.`);
    }
    assertInArea(ctx, data.area);
    return data;
  }

  async update(ctx: AccessContext, id: string | number, dto: UpdateKasDto, file?: Express.Multer.File) {
    const sid = String(id);
    // Handle virtual IPL Kas RT agregat bulanan: id = ipl-RT_01-2024-01
    if (sid.startsWith('ipl-')) {
      const parts = sid.slice(4).split('-'); // RT_01,2024,01
      // rt mengandung underscore, jadi join ulang
      const rt = parts[0] as RT;
      const tahun = parts[1];
      const bulan = parts[2];
      if (!rt || !tahun || !bulan) throw new NotFoundException('ID IPL tidak valid.');
      assertInArea(ctx, rt as Area);
      if (dto.nominal !== undefined) {
        const count = await this.prisma.ipl.count({ where: { statusPembayaran: 'LUNAS', bulanPeriode: bulan, tahunPeriode: tahun, rumah: { rt } } });
        if (count === 0) throw new NotFoundException('Tidak ada tagihan LUNAS untuk periode tersebut.');
        const nominalPerTagihan = Math.floor(Number(dto.nominal) / count);
        let sisa = Number(dto.nominal) - nominalPerTagihan * count;
        const rows = await this.prisma.ipl.findMany({ where: { statusPembayaran: 'LUNAS', bulanPeriode: bulan, tahunPeriode: tahun, rumah: { rt } }, select: { id: true } });
        for (const r of rows) {
          const add = sisa > 0 ? 1 : 0;
          if (add) sisa--;
          await this.prisma.ipl.update({ where: { id: r.id }, data: { nominalKas: nominalPerTagihan + add } });
        }
      }
      return { message: `Pemasukan Kas RT ${rt} periode ${bulan}/${tahun} berhasil diperbarui.` };
    }
    if (sid.startsWith('setoran-')) {
      throw new ForbiddenException('Setoran IPL tidak dapat diedit dari menu Keuangan.');
    }
    await this.findForWrite(ctx, sid);
    const scopeArea = areaFilter(ctx);
    if (dto.area && scopeArea) assertInArea(ctx, dto.area);

    const nid = Number(id);
    const data = await this.prisma.kasTransaksi.update({
      where: { id: nid },
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

  async remove(ctx: AccessContext, id: string | number) {
    const sid = String(id);
    if (sid.startsWith('ipl-')) {
      const parts = sid.slice(4).split('-');
      const rt = parts[0] as RT;
      const tahun = parts[1];
      const bulan = parts[2];
      if (!rt || !tahun || !bulan) throw new NotFoundException('ID IPL tidak valid.');
      assertInArea(ctx, rt as Area);
      // Hapus pemasukan Kas RT bulan tersebut = set nominalKas 0 untuk tagihan LUNAS periode terkait
      await this.prisma.ipl.updateMany({ where: { statusPembayaran: 'LUNAS', bulanPeriode: bulan, tahunPeriode: tahun, rumah: { rt } }, data: { nominalKas: 0 } });
      return { message: `Pemasukan Kas RT ${rt} periode ${bulan}/${tahun} berhasil dihapus (nominalKas di-nol-kan).` };
    }
    if (sid.startsWith('setoran-')) throw new ForbiddenException('Setoran tidak dapat dihapus dari menu Keuangan.');
    await this.findForWrite(ctx, sid);
    await this.prisma.kasTransaksi.delete({ where: { id: Number(id) } });
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
