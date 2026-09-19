import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from './public.decorator';
import { REQUIRE_PERMISSION_KEY } from './permission.decorators';
import { PermissionsService } from './permissions.service';
import { AuthedRequest } from './auth.types';

/** Jalan setelah JwtAuthGuard. Route tanpa @RequirePermission cukup butuh login. */
@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly permissions: PermissionsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const targets = [context.getHandler(), context.getClass()];
    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, targets)) {
      return true;
    }

    const kode = this.reflector.getAllAndOverride<string | undefined>(
      REQUIRE_PERMISSION_KEY,
      targets,
    );
    if (!kode) return true;

    const request = context.switchToHttp().getRequest<AuthedRequest>();
    const scope = await this.permissions.scopeOf(request.user.roleId, kode);
    if (!scope) {
      throw new ForbiddenException('Anda tidak memiliki akses untuk aksi ini.');
    }

    request.access = { user: request.user, scope };
    return true;
  }
}
