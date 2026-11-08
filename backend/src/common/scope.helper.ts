import { ForbiddenException } from '@nestjs/common';
import { Area, Prisma, RT } from '@prisma/client';
import { AccessContext } from '../auth/auth.types';
import { LEVEL_ADMIN } from './helpers';

export function areaFilter(ctx: AccessContext): Area | null {
  if (ctx.scope === 'ALL') return null;
  if (ctx.scope === 'AREA') {
    if (!ctx.user.area) {
      throw new ForbiddenException('Akun Anda belum memiliki area (RW/RT).');
    }
    return ctx.user.area;
  }
  throw new ForbiddenException('Akses hanya untuk data milik sendiri.');
}

export function assertInArea(ctx: AccessContext, area: Area | RT | null | undefined) {
  const allowed = areaFilter(ctx);
  if (allowed !== null && allowed !== area) {
    throw new ForbiddenException('Data ini di luar wilayah Anda.');
  }
}

export function rtFilter(area: Area | null): { rt?: RT | { in: RT[] } } {
  if (area === null) return {};
  if (area === 'RW') return { rt: { in: [] } };
  return { rt: area };
}

export function isRtArea(area: Area | null | undefined): area is RT {
  return !!area && area !== 'RW';
}

export function wargaBacaWhere(area: Area | null): Prisma.UserWhereInput {
  const bukanAdmin: Prisma.UserWhereInput = { role: { level: { gt: LEVEL_ADMIN } } };
  if (area === null) return bukanAdmin;
  const rumahDiArea: Prisma.UserWhereInput[] =
    area === 'RW' ? [] : [{ rumah: { some: { rt: area, isDelete: false } } }];
  return { AND: [bukanAdmin, { OR: [{ area }, ...rumahDiArea] }] };
}
