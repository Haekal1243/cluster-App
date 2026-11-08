import { Injectable } from '@nestjs/common';
import { ScopeAkses } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PermissionsService {
  private static readonly TTL_MS = 30_000;
  private cache = new Map<number, { at: number; grants: Map<string, ScopeAkses> }>();

  constructor(private prisma: PrismaService) {}

  async forRole(roleId: number): Promise<Map<string, ScopeAkses>> {
    const cached = this.cache.get(roleId);
    if (cached && Date.now() - cached.at < PermissionsService.TTL_MS) return cached.grants;

    const rows = await this.prisma.rolePermission.findMany({
      where: { roleId },
      select: { scope: true, permission: { select: { kode: true } } },
    });
    const map = new Map(rows.map((r) => [r.permission.kode, r.scope]));
    this.cache.set(roleId, { at: Date.now(), grants: map });
    return map;
  }

  async scopeOf(roleId: number, kode: string): Promise<ScopeAkses | null> {
    return (await this.forRole(roleId)).get(kode) ?? null;
  }

  async toObject(roleId: number): Promise<Record<string, ScopeAkses>> {
    return Object.fromEntries(await this.forRole(roleId));
  }

  invalidate(roleId?: number) {
    if (roleId === undefined) this.cache.clear();
    else this.cache.delete(roleId);
  }
}
