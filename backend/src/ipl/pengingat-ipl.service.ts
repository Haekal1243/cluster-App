import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { RT } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotifikasiService } from '../notifikasi/notifikasi.service';

const SEMUA_RT: RT[] = ['RT_01', 'RT_02', 'RT_03', 'RT_04'];
const MS_HARI = 24 * 60 * 60 * 1000;

const hariDariEnv = (nama: string, bawaan: number) => {
  const n = Number(process.env[nama]);
  return Number.isInteger(n) && n >= 1 && n <= 28 ? n : bawaan;
};
const TANGGAL_JATUH_TEMPO_IPL = hariDariEnv('IPL_JATUH_TEMPO_TANGGAL', 10);
const TANGGAL_JATUH_TEMPO_SETORAN = hariDariEnv('SETORAN_JATUH_TEMPO_TANGGAL', 15);

const rupiah = (n: number) => `Rp ${n.toLocaleString('id-ID')}`;

const jatuhTempo = (bulan: string, tahun: string, hari: number) =>
  new Date(Number(tahun), Number(bulan) - 1, hari);

const hariTelat = (tempo: Date, hariIni: Date) => Math.floor((hariIni.getTime() - tempo.getTime()) / MS_HARI);

@Injectable()
export class PengingatIplService {
  private readonly logger = new Logger(PengingatIplService.name);

  constructor(
    private prisma: PrismaService,
    private notifikasi: NotifikasiService,
  ) {}

  @Cron('0 9 * * *', { timeZone: 'Asia/Jakarta' })
  async kirimPengingatHarian() {
    try {
      const hariIni = new Date();
      hariIni.setHours(0, 0, 0, 0);
      const warga = await this.ingatkanWarga(hariIni);
      const pengurus = await this.ingatkanSetoran(hariIni);
      this.logger.log(`Pengingat IPL terkirim: ${warga} warga, ${pengurus} pengurus RT.`);
    } catch (err) {
      this.logger.error('Gagal mengirim pengingat IPL harian', err as Error);
    }
  }

  async ingatkanWarga(hariIni: Date): Promise<number> {
    const belum = await this.prisma.ipl.findMany({
      where: {
        statusPembayaran: 'BELUM_LUNAS',
        rumah: { isDelete: false, OR: [{ userId: { not: null } }, { penyewaId: { not: null } }] },
      },
      select: {
        bulanPeriode: true,
        tahunPeriode: true,
        nominalIpl: true,
        nominalKas: true,
        jatuhTempo: true,
        idPenyewa: true,
        rumah: { select: { userId: true } },
      },
    });

    const perWarga = new Map<number, { jumlah: number; total: number; telat: number }>();
    for (const t of belum) {
      const tempo = t.jatuhTempo
        ? new Date(t.jatuhTempo.getUTCFullYear(), t.jatuhTempo.getUTCMonth(), t.jatuhTempo.getUTCDate())
        : jatuhTempo(t.bulanPeriode, t.tahunPeriode, TANGGAL_JATUH_TEMPO_IPL);
      const telat = hariTelat(tempo, hariIni);
      const userId = t.idPenyewa ?? t.rumah.userId;
      if (telat < 0 || userId === null || userId === undefined) continue;
      const cur = perWarga.get(userId) ?? { jumlah: 0, total: 0, telat: 0 };
      cur.jumlah += 1;
      cur.total += t.nominalIpl + t.nominalKas;
      cur.telat = Math.max(cur.telat, telat);
      perWarga.set(userId, cur);
    }

    const LINK = '/dashboard/kelola-ipl/tagihan-warga';
    for (const [userId, r] of perWarga) {
      const pesan =
        r.telat === 0
          ? `Hari ini batas pembayaran IPL. Ada ${r.jumlah} tagihan belum dibayar (${rupiah(r.total)}). Segera dibayar ya.`
          : `${r.jumlah} tagihan IPL belum dibayar (${rupiah(r.total)}), sudah telat ${r.telat} hari. Segera dibayar ya.`;
      await this.ganti(userId, LINK, 'Pengingat Bayar IPL', pesan);
    }
    return perWarga.size;
  }

  async ingatkanSetoran(hariIni: Date): Promise<number> {
    let terkirim = 0;
    for (const rt of SEMUA_RT) {
      const siap = await this.prisma.ipl.findMany({
        where: { statusPembayaran: 'LUNAS', setoranId: null, rumah: { rt, status: { not: 'KOSONG' } } },
        select: { bulanPeriode: true, tahunPeriode: true, nominalIpl: true },
      });

      let jumlah = 0;
      let total = 0;
      let telat = -1;
      for (const t of siap) {
        const d = hariTelat(jatuhTempo(t.bulanPeriode, t.tahunPeriode, TANGGAL_JATUH_TEMPO_SETORAN), hariIni);
        if (d < 0) continue;
        jumlah += 1;
        total += t.nominalIpl;
        telat = Math.max(telat, d);
      }
      if (jumlah === 0) continue;

      const penerima = await this.prisma.user.findMany({
        where: {
          area: rt,
          role: { permissions: { some: { permission: { kode: 'setoran.create' } } } },
        },
        select: { id: true },
      });
      const label = rt.replace('_', ' ');
      const pesan =
        telat === 0
          ? `Hari ini batas setor IPL ${label} ke RW: ${jumlah} tagihan lunas (${rupiah(total)}) belum disetor.`
          : `IPL ${label} belum disetor ke RW: ${jumlah} tagihan lunas (${rupiah(total)}), sudah telat ${telat} hari.`;
      for (const u of penerima) {
        await this.ganti(u.id, '/dashboard/kelola-ipl/setoran', 'Pengingat Setor IPL ke RW', pesan);
        terkirim += 1;
      }
    }
    return terkirim;
  }

  private async ganti(userId: number, link: string, judul: string, pesan: string) {
    await this.notifikasi.kirimAtauPerbarui(userId, 'PENGINGAT_IPL', judul, pesan, link);
  }
}
