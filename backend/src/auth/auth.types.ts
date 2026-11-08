import { Area, ScopeAkses } from '@prisma/client';

export interface AuthUser {
  sub: number;
  username: string;
  nama: string;
  role: string;
  roleId: number;
  area: Area | null;
}

export interface AccessContext {
  user: AuthUser;
  scope: ScopeAkses;
}

export type AuthedRequest = import('express').Request & {
  user: AuthUser;
  access?: AccessContext;
};
