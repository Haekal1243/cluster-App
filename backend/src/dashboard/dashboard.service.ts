import { ForbiddenException, Injectable } from '@nestjs/common';
import { RT } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { AccessContext } from '../auth/auth.types';
import {
  currentYm,
  resolvePeriode,
  ymRangeToDates,
} from '../common/periode.helper';

// RT di RW ini tetap 4 (enum Area/RT) — penyebut "a dari b RT" selalu 4.
const RT_LIST: RT[] = ['RT_01', 'RT_02', 'RT_03', 'RT_04'];

const ymLabel = (tahun: string, bulan: string) =>
  new Date(Number(tahun), Number(bulan) - 1, 1).toLocaleDateString('id-ID', {
    month: 'short',
    year: '2-digit',
  });

/** 6 YM mundur dari ym "YYYY-MM" (inklusif), urut menaik. */
function enamPeriodeMundur(sampaiYm: string) {
  const [y, m] = sampaiYm.split('-').map(Number);
  const out: { bulan: string; tahun: string; ym: string }[] = [];
  const cursor = new Date(y, m - 1, 1);
  cursor.setMonth(cursor.getMonth() - 5);
  for (let i = 0; i < 6; i++) {
    const bulan = String(cursor.getMonth() + 1).padStart(2, '0');
    const tahun = String(cursor.getFullYear());
    out.push({ bulan, tahun, ym: `${tahun}-${bulan}` });
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return out;
}

@Injectable()
export class DashboardRwService {
  constructor(private prisma: PrismaService) {}

  async ringkasanRw(
    ctx: AccessContext,
    params: { dari?: string; sampai?: string },
  ) {
    if (ctx.scope !== 'ALL') {
      throw new ForbiddenException('Dashboard ini hanya untuk Bendahara RW.');
    }
    const ym = currentYm();
    const resolved = resolvePeriode(params.dari, params.sampai) ?? {
      periodeList: [{ bulan: ym.slice(5), tahun: ym.slice(0, 4), label: '' }],
      periodeOr: [{ bulanPeriode: ym.slice(5), tahunPeriode: ym.slice(0, 4) }],
      dariYm: ym,
      sampaiYm: ym,
    };
    const { gte, lt } = ymRangeToDates(resolved.dariYm, resolved.sampaiYm);
    const trenYm = enamPeriodeMundur(resolved.sampaiYm);
    const trenOr = trenYm.map((p) => ({
      bulanPeriode: p.bulan,
      tahunPeriode: p.tahun,
    }));
    const nowYm = currentYm();

    const [
      tertagihAgg,
      dikonfRows,
      setoranDikonfMeta,
      setoranTunggu,
      lunasRows,
      setoranDitolak,
      tagihanRtRows,
      kasPeriode,
      kasSemua,
      kasRtSemua,
      setoranSemua,
      trenSetoranRows,
      aktivitasRows,
    ] = await Promise.all([
      this.prisma.ipl.aggregate({
        _sum: { nominalIpl: true },
        where: { OR: resolved.periodeOr, rumah: { status: { not: 'KOSONG' } } },
      }),
      // Diterima per TAGIHAN periode (bukan total setoran utuh): setoran lintas
      // periode otomatis terpecah, tidak dobel-hitung antar periode.
      this.prisma.ipl.findMany({
        where: {
          OR: resolved.periodeOr,
          setoran: { status: 'DIKONFIRMASI' },
          rumah: { status: { not: 'KOSONG' } },
        },
        select: { nominalIpl: true, rumah: { select: { rt: true } } },
      }),
      // Metadata setoran terkonfirmasi (area + tanggal) untuk susulan & status terakhir.
      this.prisma.setoranIpl.findMany({
        where: {
          status: 'DIKONFIRMASI',
          tagihan: { some: { OR: resolved.periodeOr } },
        },
        select: { id: true, area: true, createDate: true },
      }),
      this.prisma.setoranIpl.findMany({
        where: {
          status: 'MENUNGGU_KONFIRMASI',
          tagihan: { some: { OR: resolved.periodeOr } },
        },
        select: {
          id: true,
          area: true,
          totalIpl: true,
          jumlahTagihan: true,
          createBy: true,
          createDate: true,
        },
        orderBy: { createDate: 'desc' },
      }),
      this.prisma.ipl.findMany({
        where: { OR: resolved.periodeOr, statusPembayaran: 'LUNAS' },
        select: {
          nominalIpl: true,
          rumah: { select: { rt: true, status: true } },
        },
      }),
      this.prisma.setoranIpl.findMany({
        where: {
          status: 'DITOLAK',
          tagihan: { some: { OR: resolved.periodeOr } },
        },
        select: {
          id: true,
          area: true,
          catatan: true,
          createDate: true,
          tanggalKonfirmasi: true,
        },
        orderBy: { tanggalKonfirmasi: 'desc' },
      }),
      this.prisma.ipl.findMany({
        where: { OR: resolved.periodeOr },
        select: { rumah: { select: { rt: true } } },
      }),
      this.prisma.kasTransaksi.findMany({
        where: { area: 'RW', tanggal: { gte, lt } },
        select: { tipe: true, nominal: true },
      }),
      this.prisma.kasTransaksi.findMany({
        where: { area: 'RW' },
        select: { tipe: true, nominal: true },
      }),
      this.prisma.ipl.findMany({
        where: { statusPembayaran: 'LUNAS' },
        select: {
          nominalIpl: true,
          nominalKas: true,
          rumah: { select: { status: true } },
        },
      }),
      this.prisma.ipl.findMany({
        where: { setoran: { status: 'DIKONFIRMASI' } },
        select: { nominalIpl: true },
      }),
      this.prisma.ipl.findMany({
        where: {
          OR: trenOr,
          setoran: { status: 'DIKONFIRMASI' },
          rumah: { status: { not: 'KOSONG' } },
        },
        select: { nominalIpl: true, bulanPeriode: true, tahunPeriode: true },
      }),
      this.prisma.setoranIpl.findMany({
        where: { tagihan: { some: { OR: resolved.periodeOr } } },
        select: {
          id: true,
          area: true,
          status: true,
          totalIpl: true,
          createBy: true,
          createDate: true,
          konfirmasiBy: true,
          tanggalKonfirmasi: true,
        },
        orderBy: { createDate: 'desc' },
        take: 5,
      }),
    ]);

    // ── KPI 1: diterima vs tertagih (basis per tagihan periode) ──
    const iplTertagih = tertagihAgg._sum.nominalIpl ?? 0;
    const diterima = dikonfRows.reduce((s, r) => s + r.nominalIpl, 0);
    const rtSudahSetor = new Set(dikonfRows.map((r) => r.rumah.rt)).size;
    const persen =
      iplTertagih > 0
        ? Math.min(100, Math.round((diterima / iplTertagih) * 100))
        : null;

    // ── KPI 2: menunggu ──
    const tungguNominal = setoranTunggu.reduce((s, r) => s + r.totalIpl, 0);
    const tungguRt = new Set(setoranTunggu.map((r) => r.area));

    // ── Agregat per RT untuk KPI 3 ──
    const terkumpul: Record<string, number> = {};
    const rtAdaTagihan = new Set<string>();
    for (const r of tagihanRtRows) rtAdaTagihan.add(r.rumah.rt);
    for (const r of lunasRows) {
      if (r.rumah.status === 'KOSONG') continue;
      terkumpul[r.rumah.rt] = (terkumpul[r.rumah.rt] ?? 0) + r.nominalIpl;
    }
    const dikonfPerRt: Record<string, number> = {};
    for (const r of dikonfRows) {
      const rt = r.rumah.rt;
      dikonfPerRt[rt] = (dikonfPerRt[rt] ?? 0) + r.nominalIpl;
    }
    const tungguPerRt: Record<string, number> = {};
    for (const r of setoranTunggu) {
      tungguPerRt[r.area] = (tungguPerRt[r.area] ?? 0) + r.totalIpl;
    }
    // Setoran terakhir per RT di periode ini (untuk status mini-list).
    const terakhirPerRt: Record<string, { status: string; tgl: Date }> = {};
    const catatTerakhir = (area: string, status: string, tgl: Date | null, fallback: Date) => {
      const t = tgl ?? fallback;
      if (!terakhirPerRt[area] || t > terakhirPerRt[area].tgl) {
        terakhirPerRt[area] = { status, tgl: t };
      }
    };
    for (const r of setoranDikonfMeta) catatTerakhir(r.area, 'DIKONFIRMASI', null, r.createDate);
    for (const r of setoranTunggu) catatTerakhir(r.area, 'MENUNGGU_KONFIRMASI', null, r.createDate);
    for (const r of setoranDitolak) {
      catatTerakhir(r.area, 'DITOLAK', r.tanggalKonfirmasi, r.createDate);
    }

    const belumItems = RT_LIST.map((rt) => ({
      rt,
      nominal: Math.max(
        0,
        (terkumpul[rt] ?? 0) - (dikonfPerRt[rt] ?? 0) - (tungguPerRt[rt] ?? 0),
      ),
      status:
        terakhirPerRt[rt]?.status === 'DITOLAK' ? 'Ditolak' : 'Belum setor',
    }))
      .filter((r) => r.nominal > 0)
      .sort((a, b) => b.nominal - a.nominal);
    const belumTotal = belumItems.reduce((s, r) => s + r.nominal, 0);

    // ── KPI 4: kas RW (agregat, mirror keuangan.service) ──
    const sumRows = (rows: { nominal: number }[]) =>
      rows.reduce((s, r) => s + r.nominal, 0);
    const masuk = sumRows(kasPeriode.filter((t) => t.tipe === 'PEMASUKAN'));
    const keluar = sumRows(kasPeriode.filter((t) => t.tipe === 'PENGELUARAN'));
    const masukCount = kasPeriode.filter((t) => t.tipe === 'PEMASUKAN').length;
    const keluarCount = kasPeriode.filter(
      (t) => t.tipe === 'PENGELUARAN',
    ).length;
    const saldo =
      kasRtSemua.reduce(
        (s, r) =>
          s + r.nominalKas + (r.rumah.status === 'KOSONG' ? r.nominalIpl : 0),
        0,
      ) +
      setoranSemua.reduce((s, r) => s + r.nominalIpl, 0) +
      sumRows(kasSemua.filter((t) => t.tipe === 'PEMASUKAN')) -
      sumRows(kasSemua.filter((t) => t.tipe === 'PENGELUARAN'));

    // ── Tren 6 periode (diterima per periode tagihan; tanpa target) ──
    const trenDiterima = new Map<string, number>();
    for (const r of trenSetoranRows) {
      const key = `${r.tahunPeriode}-${r.bulanPeriode}`;
      trenDiterima.set(key, (trenDiterima.get(key) ?? 0) + r.nominalIpl);
    }
    const tren = trenYm.map((p) => ({
      ym: p.ym,
      label: ymLabel(p.tahun, p.bulan),
      diterima: trenDiterima.get(p.ym) ?? 0,
      berjalan: p.ym === nowYm,
    }));

    // ── Perlu tindakan ──
    const rtAdaSusulan = new Set([
      ...setoranDikonfMeta.map((r) => r.area),
      ...setoranTunggu.map((r) => r.area),
    ]);
    const ditolakAktif = setoranDitolak.filter((r) => !rtAdaSusulan.has(r.area));
    const rtKosong = RT_LIST.filter((rt) => !rtAdaTagihan.has(rt)).map(
      (rt) => ({ rt, alasan: 'belum-buat' as const }),
    );
    const rtBelumTerkumpul = RT_LIST.filter(
      (rt) =>
        rtAdaTagihan.has(rt) &&
        (terkumpul[rt] ?? 0) === 0 &&
        !tungguRt.has(rt),
    ).map((rt) => ({ rt, alasan: 'belum-terkumpul' as const }));

    return {
      periode: { dari: resolved.dariYm, sampai: resolved.sampaiYm },
      kpi: {
        diterima: {
          nominal: diterima,
          persen,
          iplTertagih,
          rtSudahSetor,
          totalRt: RT_LIST.length,
        },
        menunggu: {
          nominal: tungguNominal,
          count: setoranTunggu.length,
          rtCount: tungguRt.size,
        },
        belumDisetor: {
          total: belumTotal,
          rtCount: belumItems.length,
          items: belumItems.slice(0, 3),
          sisa: Math.max(0, belumItems.length - 3),
        },
        kasRw: {
          saldo,
          masuk,
          masukCount,
          keluar,
          keluarCount,
          net: masuk - keluar,
        },
      },
      tren,
      perluTindakan: {
        total:
          setoranTunggu.length + ditolakAktif.length + rtKosong.length + rtBelumTerkumpul.length,
        menunggu: setoranTunggu.map((r) => ({
          id: r.id,
          rt: r.area,
          nominal: r.totalIpl,
          penyetor: r.createBy,
          jumlahTagihan: r.jumlahTagihan,
          waktuKirim: r.createDate,
        })),
        ditolak: ditolakAktif.map((r) => ({
          id: r.id,
          rt: r.area,
          tanggalDitolak: r.tanggalKonfirmasi ?? r.createDate,
          alasan: r.catatan,
        })),
        rtKosong: [...rtKosong, ...rtBelumTerkumpul],
      },
      aktivitas: aktivitasRows.map((r) => ({
        id: r.id,
        rt: r.area,
        status: r.status,
        nominal: r.totalIpl,
        oleh: r.status === 'MENUNGGU_KONFIRMASI' ? r.createBy : r.konfirmasiBy,
        waktu:
          r.status === 'MENUNGGU_KONFIRMASI'
            ? r.createDate
            : (r.tanggalKonfirmasi ?? r.createDate),
      })),
    };
  }
}
