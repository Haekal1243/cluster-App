import {
  createParamDecorator,
  ExecutionContext,
  SetMetadata,
} from '@nestjs/common';
import { AccessContext, AuthedRequest } from './auth.types';

export const REQUIRE_PERMISSION_KEY = 'requirePermission';

/** Route ini hanya boleh diakses role yang punya permission `<menu>.<aksi>` di tb_Role_permission. */
export const RequirePermission = (menu: string, aksi: string) =>
  SetMetadata(REQUIRE_PERMISSION_KEY, `${menu}.${aksi}`);

/** Ambil { user, scope } hasil pengecekan PermissionGuard. */
export const Access = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AccessContext => {
    const req = ctx.switchToHttp().getRequest<AuthedRequest>();
    if (!req.access) {
      // Route lupa diberi @RequirePermission; lebih aman gagal daripada lolos tanpa scope.
      throw new Error('@Access() dipakai pada route tanpa @RequirePermission');
    }
    return req.access;
  },
);

/** Ambil user yang login (route apa pun yang sudah lolos JwtAuthGuard). */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) =>
    ctx.switchToHttp().getRequest<AuthedRequest>().user,
);
