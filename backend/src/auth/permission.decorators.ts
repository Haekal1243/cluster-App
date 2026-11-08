import {
  createParamDecorator,
  ExecutionContext,
  SetMetadata,
} from '@nestjs/common';
import { AccessContext, AuthedRequest } from './auth.types';

export const REQUIRE_PERMISSION_KEY = 'requirePermission';

export const RequirePermission = (menu: string, aksi: string) =>
  SetMetadata(REQUIRE_PERMISSION_KEY, `${menu}.${aksi}`);

export const Access = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AccessContext => {
    const req = ctx.switchToHttp().getRequest<AuthedRequest>();
    if (!req.access) {
      throw new Error('@Access() dipakai pada route tanpa @RequirePermission');
    }
    return req.access;
  },
);

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) =>
    ctx.switchToHttp().getRequest<AuthedRequest>().user,
);
