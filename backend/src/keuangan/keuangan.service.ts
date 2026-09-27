import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Area, Prisma, RT } from '@prisma/client';
import { stringify } from 'csv-stringify/sync';
import ExcelJS from 'exceljs';
import { PrismaService } from '../prisma/prisma.service';
import { CreateKasDto } from './dto/create-kas.dto';
import { ExportKasDto } from './dto/export-kas.dto';
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
const labelRt = (rt: string) => rt.replace('_', ' ');
const pad2 = (n: number) => String(n).padStart(2, '0');

/** Tanggal export: DD-MM-YYYY (setiap transaksi tetap satu baris sendiri). */
function formatTanggalExport(t: Date | string): string {
  const d = new Date(t);
  return `${pad2(d.getDate())}-${pad2(d.getMonth() + 1)}-${d.getFullYear()}`;
}

// ================================================================
// EXPORT RIWAYAT KAS (CSV / XLSX) — pure function agar bisa di-test
// ================================================================

export interface KasExportRow {
  tanggal: string;
  wilayah: string;
  deskripsi: string;
  masuk: number;
  keluar: number;
  saldo: number;
}

export interface KasExportInput {
  id?: unknown;
  tanggal: Date | string;
  area: string;
  keterangan?: string | null;
  tipe: string;
  nominal: number;
}

/**
 * Urutkan ASCENDING by tanggal (oldest → newest) lalu hitung saldo berjalan:
 * saldo = saldoSebelumnya + masuk - keluar, mulai dari saldoAwal (default 0).
 * Tanggal yang SAMA dengan baris sebelumnya di-suppress (string kosong) agar
 * tabel lebih ringkas; kolom lain tetap diisi normal.
 */
export function hitungSaldoBerjalan(rows: KasExportInput[], saldoAwal = 0) {
  const sorted = [...rows].sort((a, b) => {
    const diff = new Date(a.tanggal).getTime() - new Date(b.tanggal).getTime();
    if (diff !== 0) return diff;
    return String(a.id ?? '').localeCompare(String(b.id ?? ''));
  });
  let saldo = saldoAwal;
  let totalMasuk = 0;
  let totalKeluar = 0;
  let tanggalSebelumnya = '';
  const baris: KasExportRow[] = sorted.map((r) => {
    const masuk = r.tipe === 'PEMASUKAN' ? r.nominal : 0;
    const keluar = r.tipe === 'PENGELUARAN' ? r.nominal : 0;
    saldo += masuk - keluar;
    totalMasuk += masuk;
    totalKeluar += keluar;
    const tanggal = formatTanggalExport(r.tanggal);
    const tampilkanTanggal = tanggal === tanggalSebelumnya ? '' : tanggal;
    tanggalSebelumnya = tanggal;
    return {
      tanggal: tampilkanTanggal,
      wilayah: labelRt(String(r.area)),
      deskripsi: r.keterangan ?? '-',
      masuk,
      keluar,
      saldo,
    };
  });
  return { baris, totalMasuk, totalKeluar, saldoAkhir: saldo };
}

const NAMA_BULAN_ID = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

/** "2026-09" -> "September 2026" (asumsi format YYYY-MM sudah divalidasi DTO). */
function labelBulanYm(ym: string): string {
  const [tahun, bulan] = ym.split('-');
  return `${NAMA_BULAN_ID[Number(bulan) - 1] ?? bulan} ${tahun}`;
}

/**
 * Label periode untuk title & filename: satu bulan -> "September 2026",
 * multi-bulan -> "Januari 2026 - Maret 2026", tanpa filter -> "Semua Periode".
 */
export function labelPeriodeExport(dari?: string, sampai?: string): string {
  if (dari && sampai) {
    if (dari === sampai) return labelBulanYm(dari);
    const [a, b] = dari > sampai ? [sampai, dari] : [dari, sampai];
    return `${labelBulanYm(a)} - ${labelBulanYm(b)}`;
  }
  if (dari) return labelBulanYm(dari);
  if (sampai) return labelBulanYm(sampai);
  return 'Semua Periode';
}

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
    const kategoriIsSetorIpl = kategori === 'Setor IPL';
    const kategoriIsKasRt = kategori === 'Kas RT (dari IPL warga)';
    // Hormati filter kategori untuk auto-row: Kas RT hanya muncul jika kategori SEMUA/Kas RT, Setor IPL hanya jika SEMUA/Setor IPL
    if (isPemasukanFilter && rtDipilih.length > 0 && (!kategori || kategori === 'SEMUA' || kategoriIsKasRt)) {
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

    // Setor IPL: per RT per periode tagihan (wilayah hanya RT), 1 row per RT+bulan.
    // Jika 1 setoran berisi multi-periode, akan jadi multi-row (per periode).
    // Jika 2 setoran same RT same periode, nominal dijumlah (update).
    const needSetor = isPemasukanFilter && (!kategori || kategori === 'SEMUA' || kategoriIsSetorIpl);
    let setorRtList: RT[] = [];
    if (needSetor) {
      if (area && area !== 'SEMUA' && (['RT_01','RT_02','RT_03','RT_04'] as string[]).includes(area)) {
        setorRtList = [area as RT];
      } else if (rtDipilih.length > 0) {
        setorRtList = rtDipilih;
      } else if (rwDipilih) {
        setorRtList = ['RT_01','RT_02','RT_03','RT_04'] as RT[];
      }
      // filter by user's scope: if user is RT, rtDipilih already limited
      if (areaFilter(ctx) && areaFilter(ctx) !== 'RW' && areaFilter(ctx) !== null) {
        const userRt = areaFilter(ctx) as RT;
        setorRtList = setorRtList.filter((r) => r === userRt);
      }
    }
    if (needSetor && setorRtList.length > 0) {
      const whereIplSetor: Prisma.IplWhereInput = {
        setoran: { status: 'DIKONFIRMASI' },
        rumah: { rt: { in: setorRtList } },
      };
      if (range) (whereIplSetor as any).OR = range.periodeOr;
      const iplSetorRows = await this.prisma.ipl.findMany({
        where: whereIplSetor,
        select: {
          nominalIpl: true,
          bulanPeriode: true,
          tahunPeriode: true,
          rumah: { select: { rt: true } },
          setoran: { select: { id: true, buktiTransaksi: true, tanggalKonfirmasi: true, createDate: true } },
        },
      });
      const BULAN_LABEL2: Record<string,string> = {"01":"Jan","02":"Feb","03":"Mar","04":"Apr","05":"Mei","06":"Jun","07":"Jul","08":"Agu","09":"Sep","10":"Okt","11":"Nov","12":"Des"};
      const sGroups = new Map<string, { rt:RT; bulan:string; tahun:string; total:number; count:number; buktiFile:string|null; latest:Date|null; setoranIds:Set<number> }>();
      for (const r of iplSetorRows) {
        const rt = r.rumah.rt;
        const bulan = r.bulanPeriode;
        const tahun = r.tahunPeriode;
        const key = `${rt}-${tahun}-${bulan}`;
        const g = sGroups.get(key) ?? { rt, bulan, tahun, total:0, count:0, buktiFile:null, latest:null, setoranIds:new Set<number>() };
        g.total += r.nominalIpl;
        g.count += 1;
        const sid = (r.setoran as any)?.id;
        if (sid) g.setoranIds.add(sid);
        const bukti = (r.setoran as any)?.buktiTransaksi ?? null;
        const tgl = (r.setoran as any)?.tanggalKonfirmasi ?? (r.setoran as any)?.createDate ?? null;
        if (bukti && !g.buktiFile) g.buktiFile = bukti;
        // pakai tanggalKonfirmasi terbaru untuk tanggal baris
        if (tgl && (!g.latest || new Date(tgl) > g.latest)) {
          g.latest = new Date(tgl);
          if (bukti) g.buktiFile = bukti;
        }
        sGroups.set(key, g);
      }
      for (const [key, g] of sGroups) {
        if (g.total === 0) continue;
        const label = `${BULAN_LABEL2[g.bulan]||g.bulan} ${g.tahun}`;
        const keterangan = `Setoran IPL ${labelRt(g.rt)} - ${label}`;
        const searchHay = `${keterangan} Setor IPL ${labelRt(g.rt)} ${label}`.toLowerCase();
        const searchOk = !search || searchHay.includes(search.toLowerCase());
        if (!searchOk) continue;
        autoRows.push({
          id: `setoran-${g.rt}-${g.tahun}-${g.bulan}`,
          tipe: 'PEMASUKAN',
          area: g.rt as unknown as Area,
          kategori: 'Setor IPL',
          nominal: g.total,
          tanggal: g.latest ?? new Date(Number(g.tahun), Number(g.bulan)-1, 15),
          keterangan,
          buktiFile: g.buktiFile,
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

  /**
   * GET /keuangan/export — data sama persis seperti tabel Riwayat Kas
   * (manual + baris virtual otomatis), diurut ASCENDING untuk saldo berjalan.
   */
  async exportRiwayat(ctx: AccessContext, dto: ExportKasDto) {
    const { riwayat } = await this.findAll(ctx, {
      dari: dto.dari,
      sampai: dto.sampai,
      tipe: dto.tipe,
      kategori: dto.kategori,
      search: dto.search,
      area: dto.area,
    });
    const { baris, totalMasuk, totalKeluar, saldoAkhir } = hitungSaldoBerjalan(
      riwayat,
      dto.saldoAwal ?? 0,
    );
    const periodeLabel = labelPeriodeExport(dto.dari, dto.sampai);
    const title = `Laporan Kas ${periodeLabel}`;
    // Suffix wilayah hanya bila filter RT spesifik: RT_01 -> RT01
    const rtDipilih =
      dto.area && dto.area !== 'SEMUA' && dto.area !== 'RW' && SEMUA_AREA.includes(dto.area as Area)
        ? dto.area.replace('_', '')
        : '';
    const baseName = `Laporan Kas-${rtDipilih ? `${rtDipilih}-` : ''}${periodeLabel}`;

    if (dto.format === 'csv') {
      // BOM agar file terbuka rapi di Excel Indonesia; baris 1 = title, baris 2 = header
      const csv =
        String.fromCharCode(0xfeff) +
        `${title}\n` +
        stringify(
          [
            ...baris,
            { tanggal: '', wilayah: '', deskripsi: 'TOTAL', masuk: totalMasuk, keluar: totalKeluar, saldo: saldoAkhir },
          ],
          {
            header: true,
            delimiter: ',',
            columns: [
              { key: 'tanggal', header: 'Tanggal' },
              { key: 'wilayah', header: 'Wilayah' },
              { key: 'deskripsi', header: 'Deskripsi' },
              { key: 'masuk', header: 'Masuk' },
              { key: 'keluar', header: 'Keluar' },
              { key: 'saldo', header: 'Saldo' },
            ],
          },
        );
      return {
        filename: `${baseName}.csv`,
        contentType: 'text/csv; charset=utf-8',
        buffer: Buffer.from(csv, 'utf8'),
      };
    }

    const workbook = new ExcelJS.Workbook();
    const ws = workbook.addWorksheet('Riwayat Kas');
    // Tanpa `header` di columns agar baris header tidak otomatis dibuat di row 1
    ws.columns = [
      { key: 'tanggal', width: 14 },
      { key: 'wilayah', width: 12 },
      { key: 'deskripsi', width: 44 },
      { key: 'masuk', width: 16 },
      { key: 'keluar', width: 16 },
      { key: 'saldo', width: 16 },
    ];
    // Row 1 = title (merge A-F, center, bold 14pt)
    ws.mergeCells('A1:F1');
    const titleCell = ws.getCell('A1');
    titleCell.value = title;
    titleCell.font = { bold: true, size: 14 };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    // Row 2 = header
    ws.addRow(['Tanggal', 'Wilayah', 'Deskripsi', 'Masuk', 'Keluar', 'Saldo']);
    for (const b of baris) {
      ws.addRow([b.tanggal, b.wilayah, b.deskripsi, b.masuk, b.keluar, b.saldo]);
    }
    ws.addRow(['', '', 'TOTAL', totalMasuk, totalKeluar, saldoAkhir]);
    ws.getRow(2).font = { bold: true };
    const lastRow = ws.lastRow;
    if (lastRow) lastRow.font = { bold: true };
    // Kolom angka sebagai number agar bisa di-SUM di Excel (data mulai row 3)
    for (let i = 3; i <= ws.rowCount; i++) {
      for (const col of ['D', 'E', 'F']) ws.getCell(`${col}${i}`).numFmt = '#,##0';
    }
    const xlsx = await workbook.xlsx.writeBuffer();
    return {
      filename: `${baseName}.xlsx`,
      contentType:
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      buffer: Buffer.from(xlsx),
    };
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

    // Untuk Setor IPL wilayah hanya RT: tentukan RT yang visible untuk setor
    let setorRtList: RT[] = [];
    const filterAreaIsRt = params?.area && params.area !== 'SEMUA' && (['RT_01','RT_02','RT_03','RT_04'] as string[]).includes(params.area);
    if (filterAreaIsRt) {
      setorRtList = [params!.area as RT];
    } else if (rtDipilih.length > 0) {
      setorRtList = rtDipilih;
    } else if (rwDipilih) {
      setorRtList = ['RT_01','RT_02','RT_03','RT_04'] as RT[];
    }
    // batasi sesuai scope user RT
    const userRt = areaFilter(ctx) as RT | null;
    if (userRt && (['RT_01','RT_02','RT_03','RT_04'] as string[]).includes(userRt)) {
      setorRtList = setorRtList.filter((r) => r === userRt);
    }
    const setorRtSaja = setorRtList.length ? { rumah: { rt: { in: setorRtList } } } : tanpaRw;
    const setorRtSajaAll = setorRtList.length ? { rumah: { rt: { in: setorRtList } } } : tanpaRw;

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
        // Setoran RT yang dikonfirmasi RW menjadi pemasukan kas RW — filter by periode tagihan (bukan tanggalKonfirmasi), per RT
        this.prisma.ipl.findMany({
          where: { OR: resolved.periodeOr, setoran: { status: 'DIKONFIRMASI' }, ...setorRtSaja },
          select: { nominalIpl: true, bulanPeriode: true, tahunPeriode: true },
        }),
        this.prisma.ipl.findMany({
          where: { setoran: { status: 'DIKONFIRMASI' }, ...setorRtSajaAll },
          select: { nominalIpl: true },
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
    const setoranTotal = setoranPeriode.reduce((s, r) => s + (r as any).nominalIpl, 0);
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
    if (setoranTotal) perKategori.PEMASUKAN['Setor IPL'] = setoranTotal;
    for (const t of kasPeriode) {
      const bucket = perKategori[t.tipe];
      bucket[t.kategori] = (bucket[t.kategori] ?? 0) + t.nominal;
    }

    // Saldo kas saat ini (kumulatif sepanjang waktu)
    const saldoKas =
      kasRtSemua.reduce((s, r) => s + r.nominalKas, 0) +
      setoranSemua.reduce((s, r) => s + (r as any).nominalIpl, 0) +
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
      const setoranBulanIni = (setoranPeriode as any[])
        .filter((s) => (s as any).bulanPeriode === bulan && (s as any).tahunPeriode === tahun)
        .reduce((s, r) => s + (r as any).nominalIpl, 0);
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
