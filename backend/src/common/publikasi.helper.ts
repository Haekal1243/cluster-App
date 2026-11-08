import { ForbiddenException } from '@nestjs/common';
import { Area, StatusPengajuan } from '@prisma/client';
import { AccessContext } from '../auth/auth.types';

export function visibilitasWhere(ctx: AccessContext) {
  if (ctx.scope === 'ALL') return {};
  const or: Array<Record<string, unknown>> = [
    { area: 'RW' },
    { statusPengajuan: 'DISETUJUI' },
  ];
  if (ctx.user.area) or.push({ area: ctx.user.area });
  return { OR: or };
}

export function visibilitasKelolaWhere(ctx: AccessContext) {
  if (ctx.scope === 'ALL') return {};
  return { area: ctx.user.area ?? 'RW' };
}

export const tampilKeSemua = {
  OR: [{ area: 'RW' as Area }, { statusPengajuan: 'DISETUJUI' as const }],
};

export function assertBolehUbahKonten(
  ctx: AccessContext,
  item: { area: Area; statusPengajuan: StatusPengajuan },
) {
  const hanyaRt = item.area !== 'RW' && (item.statusPengajuan === 'TIDAK' || item.statusPengajuan === 'DITOLAK');
  if (hanyaRt && ctx.user.area && ctx.user.area !== item.area) {
    throw new ForbiddenException('Konten ini hanya tampil di RT-nya, pengurus RW hanya bisa melihat.');
  }
}

export function belumLewatBatasTampil() {
  return { OR: [{ tampilSampai: null }, { tampilSampai: { gte: new Date() } }] };
}

export function tampilSampaiDari(durasiHari?: number): Date | null | undefined {
  if (durasiHari === undefined) return undefined;
  if (durasiHari <= 0) return null;
  const batas = new Date();
  batas.setDate(batas.getDate() + durasiHari);
  return batas;
}
