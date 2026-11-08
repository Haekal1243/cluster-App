import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Area, Prisma, RT } from '@prisma/client';
import { stringify } from 'csv-stringify/sync';
import ExcelJS from 'exceljs';
import { PrismaService } from '../prisma/prisma.service';
import { FileService } from '../common/file/file.service';
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

const sum = (rows: { nominal: number }[]) =>
  rows.reduce((s, r) => s + r.nominal, 0);
const labelRt = (rt: string) => rt.replace('_', ' ');
const pad2 = (n: number) => String(n).padStart(2, '0');

function formatTanggalExport(t: Date | string): string {
  const d = new Date(t);
  return `${pad2(d.getDate())}-${pad2(d.getMonth() + 1)}-${d.getFullYear()}`;
}

export function netralkanSelCsv<T>(nilai: T): T | string {
  if (typeof nilai !== 'string') return nilai;
  return /^[=+\-@\t\r]/.test(nilai) ? `'${nilai}` : nilai;
}


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
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
];

function labelBulanYm(ym: string): string {
  const [tahun, bulan] = ym.split('-');
  return `${NAMA_BULAN_ID[Number(bulan) - 1] ?? bulan} ${tahun}`;
}

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
  constructor(
    private prisma: PrismaService,
    private files: FileService,
  ) {}

  private areasFor(ctx: AccessContext, pilih?: string): Area[] {
    if (ctx.user.area) return [ctx.user.area];
    const area = areaFilter(ctx);
    if (area) return [area];
    if (pilih && (SEMUA_AREA as string[]).includes(pilih))
      return [pilih as Area];
    return SEMUA_AREA;
  }


  async create(
    ctx: AccessContext,
    dto: CreateKasDto,
    file?: Express.Multer.File,
  ) {
    const area = ctx.user.area ?? dto.area ?? 'RW';

    const buktiFile = file ? await this.files.simpan(file) : null;
    const data = await this.prisma.kasTransaksi.create({
      data: {
        tipe: dto.tipe,
        area,
        kategori: dto.kategori,
        nominal: dto.nominal,
        tanggal: new Date(dto.tanggal),
        keterangan: dto.keterangan ?? null,
        buktiFile,
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
    if (kategori && kategori !== 'SEMUA') and.push({ kategori });
    if (search) {
      and.push({
        OR: [
          { kategori: { contains: search } },
          { keterangan: { contains: search } },
        ],
      });
    }

    const manualRows = await this.prisma.kasTransaksi.findMany({
      where: { AND: and },
      orderBy: [{ tanggal: 'desc' }, { id: 'desc' }],
    });

    const autoRows: any[] = [];
    const isPemasukanFilter = !tipe || tipe === 'SEMUA' || tipe === 'PEMASUKAN';
    const kategoriIsSetorIpl = kategori === 'Setor IPL';
    const kategoriIsKasRt = kategori === 'Kas RT (dari IPL warga)';
    if (
      isPemasukanFilter &&
      rtDipilih.length > 0 &&
      (!kategori || kategori === 'SEMUA' || kategoriIsKasRt)
    ) {
      const whereIpl: Prisma.IplWhereInput = {
        statusPembayaran: 'LUNAS',
        rumah: { rt: { in: rtDipilih } },
      };
      if (range) (whereIpl as any).OR = range.periodeOr;

      const iplRows = await this.prisma.ipl.findMany({
        where: whereIpl,
        select: {
          nominalIpl: true,
          nominalKas: true,
          bulanPeriode: true,
          tahunPeriode: true,
          rumah: { select: { rt: true, status: true } },
          pembayaran: {
            select: { tanggalKonfirmasi: true },
            orderBy: { tanggalKonfirmasi: 'desc' },
            take: 1,
          },
        },
      });

      const BULAN_LABEL: Record<string, string> = {
        '01': 'Jan',
        '02': 'Feb',
        '03': 'Mar',
        '04': 'Apr',
        '05': 'Mei',
        '06': 'Jun',
        '07': 'Jul',
        '08': 'Agu',
        '09': 'Sep',
        '10': 'Okt',
        '11': 'Nov',
        '12': 'Des',
      };
      const groups = new Map<
        string,
        {
          rt: RT;
          bulan: string;
          tahun: string;
          total: number;
          count: number;
          latest: Date | null;
        }
      >();
      for (const r of iplRows) {
        const key = `${r.rumah.rt}-${r.tahunPeriode}-${r.bulanPeriode}`;
        const g = groups.get(key) ?? {
          rt: r.rumah.rt,
          bulan: r.bulanPeriode,
          tahun: r.tahunPeriode,
          total: 0,
          count: 0,
          latest: null,
        };
        g.total +=
          r.nominalKas + (r.rumah.status === 'KOSONG' ? r.nominalIpl : 0);
        g.count += 1;
        const t = r.pembayaran[0]?.tanggalKonfirmasi ?? null;
        if (t && (!g.latest || t > g.latest)) g.latest = t;
        groups.set(key, g);
      }
      for (const [key, g] of groups) {
        if (g.total === 0) continue;
        const label = `${BULAN_LABEL[g.bulan] || g.bulan} ${g.tahun}`;
        const keterangan = `Kas RT (${label})`;
        const searchOk =
          !search ||
          `${keterangan} Kas RT (dari IPL warga) ${g.rt} ${label}`
            .toLowerCase()
            .includes(search.toLowerCase());
        if (!searchOk) continue;
        const tanggal =
          g.latest ?? new Date(Number(g.tahun), Number(g.bulan) - 1, 15);
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

    const needSetor =
      isPemasukanFilter &&
      (!kategori || kategori === 'SEMUA' || kategoriIsSetorIpl);
    let setorRtList: RT[] = [];
    if (needSetor && rwDipilih) {
      if (
        area &&
        area !== 'SEMUA' &&
        (['RT_01', 'RT_02', 'RT_03', 'RT_04'] as string[]).includes(area)
      ) {
        setorRtList = [area as RT];
      } else if (rtDipilih.length > 0) {
        setorRtList = rtDipilih;
      } else {
        setorRtList = ['RT_01', 'RT_02', 'RT_03', 'RT_04'] as RT[];
      }
      if (
        areaFilter(ctx) &&
        areaFilter(ctx) !== 'RW' &&
        areaFilter(ctx) !== null
      ) {
        const userRt = areaFilter(ctx) as RT;
        setorRtList = setorRtList.filter((r) => r === userRt);
      }
    }
    if (needSetor && setorRtList.length > 0) {
      const whereIplSetor: Prisma.IplWhereInput = {
        setoran: { status: 'DIKONFIRMASI' },
        rumah: { rt: { in: setorRtList }, status: { not: 'KOSONG' } },
      };
      if (range) (whereIplSetor as any).OR = range.periodeOr;
      const iplSetorRows = await this.prisma.ipl.findMany({
        where: whereIplSetor,
        select: {
          nominalIpl: true,
          bulanPeriode: true,
          tahunPeriode: true,
          rumah: { select: { rt: true } },
          setoran: {
            select: {
              id: true,
              buktiTransaksi: true,
              tanggalKonfirmasi: true,
              createDate: true,
            },
          },
        },
      });
      const BULAN_LABEL2: Record<string, string> = {
        '01': 'Jan',
        '02': 'Feb',
        '03': 'Mar',
        '04': 'Apr',
        '05': 'Mei',
        '06': 'Jun',
        '07': 'Jul',
        '08': 'Agu',
        '09': 'Sep',
        '10': 'Okt',
        '11': 'Nov',
        '12': 'Des',
      };

      const sGroups = new Map<
        string,
        {
          rt: RT;
          bulan: string;
          tahun: string;
          setoranId: number;
          total: number;
          buktiFile: string | null;
          tanggal: Date;
        }
      >();
      for (const r of iplSetorRows) {
        const s = r.setoran as any;
        if (!s) continue;
        const key = `${r.rumah.rt}-${r.tahunPeriode}-${r.bulanPeriode}-${s.id}`;
        const g = sGroups.get(key) ?? {
          rt: r.rumah.rt,
          bulan: r.bulanPeriode,
          tahun: r.tahunPeriode,
          setoranId: s.id as number,
          total: 0,
          buktiFile: s.buktiTransaksi ?? null,
          tanggal: new Date(s.tanggalKonfirmasi ?? s.createDate),
        };
        g.total += r.nominalIpl;
        sGroups.set(key, g);
      }

      const urutPerPeriode = new Map<string, number[]>();
      for (const g of [...sGroups.values()].sort(
        (a, b) =>
          a.tanggal.getTime() - b.tanggal.getTime() ||
          a.setoranId - b.setoranId,
      )) {
        const k = `${g.rt}-${g.tahun}-${g.bulan}`;
        urutPerPeriode.set(k, [...(urutPerPeriode.get(k) ?? []), g.setoranId]);
      }

      for (const g of sGroups.values()) {
        if (g.total === 0) continue;
        const label = `${BULAN_LABEL2[g.bulan] || g.bulan} ${g.tahun}`;
        const ke = urutPerPeriode
          .get(`${g.rt}-${g.tahun}-${g.bulan}`)!
          .indexOf(g.setoranId);
        const keterangan = `Setoran IPL ${labelRt(g.rt)} - ${label}${ke > 0 ? ' (susulan)' : ''}`;
        const searchHay =
          `${keterangan} Setor IPL ${labelRt(g.rt)} ${label}`.toLowerCase();
        if (search && !searchHay.includes(search.toLowerCase())) continue;

        autoRows.push({
          id: `setoran-${g.rt}-${g.tahun}-${g.bulan}-${g.setoranId}`,
          tipe: 'PEMASUKAN',
          area: g.rt as unknown as Area,
          kategori: 'Setor IPL',
          nominal: g.total,
          tanggal: g.tanggal,
          keterangan,
          buktiFile: g.buktiFile,
          sumber: 'SETORAN' as const,
          locked: true,
        });
      }
    }

    const riwayat = [
      ...manualRows.map((r) => ({
        ...r,
        sumber: 'MANUAL' as const,
        locked: false,
      })),
      ...autoRows,
    ].sort((a, b) => {
      const ta = new Date(a.tanggal).getTime();
      const tb = new Date(b.tanggal).getTime();
      if (tb !== ta) return tb - ta;
      return String(b.id).localeCompare(String(a.id));
    });

    return { riwayat };
  }

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
    const rtDipilih =
      dto.area &&
      dto.area !== 'SEMUA' &&
      dto.area !== 'RW' &&
      SEMUA_AREA.includes(dto.area as Area)
        ? dto.area.replace('_', '')
        : '';
    const baseName = `Laporan Kas-${rtDipilih ? `${rtDipilih}-` : ''}${periodeLabel}`;

    if (dto.format === 'csv') {
      const csv =
        String.fromCharCode(0xfeff) +
        `${title}\n` +
        stringify(
          [
            ...baris.map((b) => ({
              ...b,
              wilayah: netralkanSelCsv(b.wilayah),
              deskripsi: netralkanSelCsv(b.deskripsi),
            })),
            {
              tanggal: '',
              wilayah: '',
              deskripsi: 'TOTAL',
              masuk: totalMasuk,
              keluar: totalKeluar,
              saldo: saldoAkhir,
            },
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
    ws.columns = [
      { key: 'tanggal', width: 14 },
      { key: 'wilayah', width: 12 },
      { key: 'deskripsi', width: 44 },
      { key: 'masuk', width: 16 },
      { key: 'keluar', width: 16 },
      { key: 'saldo', width: 16 },
    ];
    ws.mergeCells('A1:F1');
    const titleCell = ws.getCell('A1');
    titleCell.value = title;
    titleCell.font = { bold: true, size: 14 };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    ws.addRow(['Tanggal', 'Wilayah', 'Deskripsi', 'Masuk', 'Keluar', 'Saldo']);
    for (const b of baris) {
      ws.addRow([
        b.tanggal,
        b.wilayah,
        b.deskripsi,
        b.masuk,
        b.keluar,
        b.saldo,
      ]);
    }
    ws.addRow(['', '', 'TOTAL', totalMasuk, totalKeluar, saldoAkhir]);
    ws.getRow(2).font = { bold: true };
    const lastRow = ws.lastRow;
    if (lastRow) lastRow.font = { bold: true };
    for (let i = 3; i <= ws.rowCount; i++) {
      for (const col of ['D', 'E', 'F'])
        ws.getCell(`${col}${i}`).numFmt = '#,##0';
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
      return { id: sid, virtual: true } as any;
    }
    const nid = Number(id);
    const data = await this.prisma.kasTransaksi.findUnique({
      where: { id: nid },
    });
    if (!data) {
      throw new NotFoundException(
        `Transaksi kas dengan ID ${id} tidak ditemukan.`,
      );
    }
    if (!this.areasFor(ctx).includes(data.area)) {
      throw new ForbiddenException('Transaksi ini di luar wilayah Anda.');
    }
    return data;
  }

  async fileIdBukti(ctx: AccessContext, id: string | number) {
    const sid = String(id);
    if (sid.startsWith('setoran-')) {
      const parts = sid.slice('setoran-'.length).split('-');
      const rt = parts[0] as RT;
      const tahun = parts[1];
      const bulan = parts[2];
      if (!rt || !tahun || !bulan)
        throw new NotFoundException('ID setoran tidak valid.');
      const batas = areaFilter(ctx);
      if (batas !== null && batas !== 'RW' && batas !== rt) {
        throw new ForbiddenException('Data ini di luar wilayah Anda.');
      }
      const row = await this.prisma.ipl.findFirst({
        where: {
          bulanPeriode: bulan,
          tahunPeriode: tahun,
          rumah: { rt },
          setoran: { buktiTransaksi: { not: null } },
        },
        orderBy: { setoran: { tanggalKonfirmasi: 'desc' } },
        select: { setoran: { select: { buktiTransaksi: true } } },
      });
      const bukti = row?.setoran?.buktiTransaksi ?? null;
      if (!bukti)
        throw new NotFoundException('Transaksi ini tidak memiliki bukti file.');
      return bukti;
    }
    const data = await this.findOne(ctx, id);
    if (data.virtual || !data.buktiFile) {
      throw new NotFoundException('Transaksi ini tidak memiliki bukti file.');
    }
    return data.buktiFile;
  }

  private async findForWrite(ctx: AccessContext, id: string | number) {
    const sid = String(id);
    if (sid.startsWith('ipl-') || sid.startsWith('setoran-'))
      return { virtual: true, sid } as any;
    const nid = Number(id);
    const data = await this.prisma.kasTransaksi.findUnique({
      where: { id: nid },
    });
    if (!data) {
      throw new NotFoundException(
        `Transaksi kas dengan ID ${id} tidak ditemukan.`,
      );
    }
    if (ctx.user.area && data.area !== ctx.user.area) {
      throw new ForbiddenException('Transaksi ini di luar wilayah Anda.');
    }
    assertInArea(ctx, data.area);
    return data;
  }

  async update(
    ctx: AccessContext,
    id: string | number,
    dto: UpdateKasDto,
    file?: Express.Multer.File,
  ) {
    const sid = String(id);
    if (sid.startsWith('ipl-')) {
      const parts = sid.slice(4).split('-');
      const rt = parts[0] as RT;
      const tahun = parts[1];
      const bulan = parts[2];
      if (!rt || !tahun || !bulan)
        throw new NotFoundException('ID IPL tidak valid.');
      assertInArea(ctx, rt as Area);
      if (dto.nominal !== undefined) {
        const rows = await this.prisma.ipl.findMany({
          where: {
            statusPembayaran: 'LUNAS',
            bulanPeriode: bulan,
            tahunPeriode: tahun,
            rumah: { rt },
          },
          select: {
            id: true,
            nominalIpl: true,
            rumah: { select: { status: true } },
          },
        });
        if (rows.length === 0)
          throw new NotFoundException(
            'Tidak ada tagihan LUNAS untuk periode tersebut.',
          );
        const nominalPerTagihan = Math.floor(Number(dto.nominal) / rows.length);
        let sisa = Number(dto.nominal) - nominalPerTagihan * rows.length;
        for (const r of rows) {
          const add = sisa > 0 ? 1 : 0;
          if (add) sisa--;
          const perTagihan = nominalPerTagihan + add;
          if (r.rumah.status === 'KOSONG') {
            await this.prisma.ipl.update({
              where: { id: r.id },
              data: { nominalIpl: 0, nominalKas: perTagihan },
            });
          } else {
            await this.prisma.ipl.update({
              where: { id: r.id },
              data: { nominalKas: perTagihan },
            });
          }
        }
      }
      return {
        message: `Pemasukan Kas RT ${rt} periode ${bulan}/${tahun} berhasil diperbarui.`,
      };
    }
    if (sid.startsWith('setoran-')) {
      throw new ForbiddenException(
        'Setoran IPL tidak dapat diedit dari menu Keuangan.',
      );
    }
    const existing = await this.findForWrite(ctx, sid);
    const areaTujuan = dto.area ?? existing.area;
    if (ctx.user.area && areaTujuan !== ctx.user.area) {
      throw new ForbiddenException('Transaksi ini di luar wilayah Anda.');
    }

    const buktiBaru = file ? await this.files.simpan(file) : undefined;
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
        ...(buktiBaru && { buktiFile: buktiBaru }),
        updatedAt: new Date(),
      },
    });
    if (buktiBaru) await this.files.hapus(existing.buktiFile);
    return { message: 'Transaksi kas berhasil diperbarui.', data };
  }

  async remove(ctx: AccessContext, id: string | number) {
    const sid = String(id);
    if (sid.startsWith('ipl-')) {
      const parts = sid.slice(4).split('-');
      const rt = parts[0] as RT;
      const tahun = parts[1];
      const bulan = parts[2];
      if (!rt || !tahun || !bulan)
        throw new NotFoundException('ID IPL tidak valid.');
      assertInArea(ctx, rt as Area);
      const base = {
        statusPembayaran: 'LUNAS',
        bulanPeriode: bulan,
        tahunPeriode: tahun,
        rumah: { rt },
      } as const;
      await this.prisma.ipl.updateMany({
        where: { ...base, rumah: { rt, status: { not: 'KOSONG' } } },
        data: { nominalKas: 0 },
      });
      await this.prisma.ipl.updateMany({
        where: { ...base, rumah: { rt, status: 'KOSONG' } },
        data: { nominalIpl: 0, nominalKas: 0 },
      });
      return {
        message: `Pemasukan Kas RT ${rt} periode ${bulan}/${tahun} berhasil dihapus (kontribusi kas di-nol-kan).`,
      };
    }
    if (sid.startsWith('setoran-'))
      throw new ForbiddenException(
        'Setoran tidak dapat dihapus dari menu Keuangan.',
      );
    const existing = await this.findForWrite(ctx, sid);
    await this.prisma.kasTransaksi.delete({ where: { id: Number(id) } });
    await this.files.hapus(existing.buktiFile);
    return { message: 'Transaksi kas berhasil dihapus.' };
  }


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

    const tanpaRw = { id: { in: [] as number[] } };
    const rtSaja = { rumah: { rt: { in: rtDipilih } } };

    let setorRtList: RT[] = [];
    const filterAreaIsRt =
      params?.area &&
      params.area !== 'SEMUA' &&
      (['RT_01', 'RT_02', 'RT_03', 'RT_04'] as string[]).includes(params.area);
    if (filterAreaIsRt && rwDipilih) {
      setorRtList = [params!.area as RT];
    } else if (rtDipilih.length > 0 && rwDipilih) {
      setorRtList = rtDipilih;
    } else if (rwDipilih) {
      setorRtList = ['RT_01', 'RT_02', 'RT_03', 'RT_04'] as RT[];
    }
    const userRt = areaFilter(ctx) as RT | null;
    if (
      userRt &&
      (['RT_01', 'RT_02', 'RT_03', 'RT_04'] as string[]).includes(userRt)
    ) {
      setorRtList = setorRtList.filter((r) => r === userRt);
    }
    const setorRtSaja = setorRtList.length
      ? {
          rumah: {
            rt: { in: setorRtList },
            status: { not: 'KOSONG' as const },
          },
        }
      : tanpaRw;
    const setorRtSajaAll = setorRtList.length
      ? {
          rumah: {
            rt: { in: setorRtList },
            status: { not: 'KOSONG' as const },
          },
        }
      : tanpaRw;

    const kasRt = (r: {
      nominalIpl: number;
      nominalKas: number;
      rumah: { status: string };
    }) => r.nominalKas + (r.rumah.status === 'KOSONG' ? r.nominalIpl : 0);

    const [
      kasRtPeriode,
      kasRtSemua,
      setoranPeriode,
      setoranSemua,
      kasPeriode,
      kasSemua,
      titipan,
    ] = await Promise.all([
      this.prisma.ipl.findMany({
        where: { OR: resolved.periodeOr, statusPembayaran: 'LUNAS', ...rtSaja },
        select: {
          nominalIpl: true,
          nominalKas: true,
          bulanPeriode: true,
          tahunPeriode: true,
          rumah: { select: { rt: true, status: true } },
        },
      }),
      this.prisma.ipl.findMany({
        where: { statusPembayaran: 'LUNAS', ...rtSaja },
        select: {
          nominalIpl: true,
          nominalKas: true,
          rumah: { select: { status: true } },
        },
      }),
      this.prisma.ipl.findMany({
        where: {
          OR: resolved.periodeOr,
          setoran: { status: 'DIKONFIRMASI' },
          ...setorRtSaja,
        },
        select: { nominalIpl: true, bulanPeriode: true, tahunPeriode: true },
      }),
      this.prisma.ipl.findMany({
        where: { setoran: { status: 'DIKONFIRMASI' }, ...setorRtSajaAll },
        select: { nominalIpl: true },
      }),
      this.prisma.kasTransaksi.findMany({
        where: { area: { in: areas }, tanggal: { gte, lt } },
        select: {
          tipe: true,
          kategori: true,
          nominal: true,
          tanggal: true,
          area: true,
        },
      }),
      this.prisma.kasTransaksi.findMany({
        where: { area: { in: areas } },
        select: { tipe: true, nominal: true },
      }),
      this.prisma.ipl.findMany({
        where: {
          statusPembayaran: 'LUNAS',
          ...rtSaja,
          rumah: { rt: { in: rtDipilih }, status: { not: 'KOSONG' } },
          OR: [
            { setoranId: null },
            { setoran: { status: { not: 'DIKONFIRMASI' } } },
          ],
        },
        select: { nominalIpl: true },
      }),
    ]);

    const kasRtTotal = kasRtPeriode.reduce((s, r) => s + kasRt(r as any), 0);
    const setoranTotal = setoranPeriode.reduce(
      (s, r) => s + (r as any).nominalIpl,
      0,
    );
    const pemasukanOtomatis = kasRtTotal + setoranTotal;
    const pemasukanManual = sum(
      kasPeriode.filter((t) => t.tipe === 'PEMASUKAN'),
    );
    const totalPemasukan = pemasukanOtomatis + pemasukanManual;
    const totalPengeluaran = sum(
      kasPeriode.filter((t) => t.tipe === 'PENGELUARAN'),
    );

    const perKategori: Record<string, Record<string, number>> = {
      PEMASUKAN: {},
      PENGELUARAN: {},
    };
    if (kasRtTotal)
      perKategori.PEMASUKAN['Kas RT (dari IPL warga)'] = kasRtTotal;
    if (setoranTotal) perKategori.PEMASUKAN['Setor IPL'] = setoranTotal;
    for (const t of kasPeriode) {
      const bucket = perKategori[t.tipe];
      bucket[t.kategori] = (bucket[t.kategori] ?? 0) + t.nominal;
    }

    const saldoKas =
      kasRtSemua.reduce((s, r) => s + kasRt(r as any), 0) +
      setoranSemua.reduce((s, r) => s + (r as any).nominalIpl, 0) +
      sum(kasSemua.filter((t) => t.tipe === 'PEMASUKAN')) -
      sum(kasSemua.filter((t) => t.tipe === 'PENGELUARAN'));

    const ymKey = (tanggal: Date) =>
      `${tanggal.getFullYear()}-${String(tanggal.getMonth() + 1).padStart(2, '0')}`;
    const tren = resolved.periodeList.map(({ bulan, tahun, label }) => {
      const key = `${tahun}-${bulan}`;
      const kasBulanIni = kasRtPeriode
        .filter((t) => t.bulanPeriode === bulan && t.tahunPeriode === tahun)
        .reduce((s, t) => s + kasRt(t as any), 0);
      const setoranBulanIni = (setoranPeriode as any[])
        .filter(
          (s) =>
            (s as any).bulanPeriode === bulan &&
            (s as any).tahunPeriode === tahun,
        )
        .reduce((s, r) => s + (r as any).nominalIpl, 0);
      const manualBulan = kasPeriode.filter((t) => ymKey(t.tanggal) === key);
      return {
        label,
        bulan,
        tahun,
        pemasukan:
          kasBulanIni +
          setoranBulanIni +
          sum(manualBulan.filter((t) => t.tipe === 'PEMASUKAN')),
        pengeluaran: sum(manualBulan.filter((t) => t.tipe === 'PENGELUARAN')),
      };
    });

    const perArea = areas.map((area) => {
      const manual = kasPeriode.filter((t) => t.area === area);
      const otomatis =
        area === 'RW'
          ? setoranTotal
          : kasRtPeriode
              .filter((r) => r.rumah.rt === area)
              .reduce((s, r) => s + kasRt(r as any), 0);
      const pemasukan =
        otomatis + sum(manual.filter((t) => t.tipe === 'PEMASUKAN'));
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
        kasRtDariRumahKosong: kasRtPeriode
          .filter((r) => (r as any).rumah.status === 'KOSONG')
          .reduce(
            (s, r) => s + (r as any).nominalIpl + (r as any).nominalKas,
            0,
          ),
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
