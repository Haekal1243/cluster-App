import { Prisma } from '@prisma/client';


export function iplMilikAkun(userId: number): Prisma.IplWhereInput {
  return {
    OR: [
      { idPenyewa: null, rumah: { userId, isDelete: false } },
      { idPenyewa: userId },
      { idPenyewa: null, statusPembayaran: { not: 'LUNAS' }, rumah: { penyewaId: userId, isDelete: false } },
    ],
  };
}

export function rumahMilikAkun(userId: number): Prisma.RumahWhereInput {
  return { isDelete: false, OR: [{ userId }, { penyewaId: userId }] };
}

export const penerimaTagihan = (r: { userId: number | null; penyewaId: number | null }) => r.penyewaId ?? r.userId;
