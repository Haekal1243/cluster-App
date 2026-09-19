import { Area, ScopeAkses } from '@prisma/client';

/** User yang sedang login. Dimuat ulang dari DB di setiap request, jadi selalu terbaru. */
export interface AuthUser {
  sub: number;
  username: string;
  nama: string;
  role: string; // kode role, contoh: KETUA_RT
  roleId: number;
  area: Area | null;
}

/** Hasil pengecekan permission: siapa yang minta dan sejauh mana datanya boleh diakses. */
export interface AccessContext {
  user: AuthUser;
  scope: ScopeAkses;
}

export type AuthedRequest = import('express').Request & {
  user: AuthUser;
  access?: AccessContext;
};
