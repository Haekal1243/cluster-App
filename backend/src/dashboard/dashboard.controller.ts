import { Controller, ForbiddenException, Get, Query } from '@nestjs/common';
import { DashboardRwService } from './dashboard.service';
import { Access, RequirePermission } from '../auth/permission.decorators';
import type { AccessContext } from '../auth/auth.types';

/** Agregat dashboard khusus Bendahara RW. Scope ALL dipaksa di service. */
@Controller('dashboard')
export class DashboardRwController {
  constructor(private readonly dashboardRw: DashboardRwService) {}

  @Get('rw')
  @RequirePermission('setoran', 'konfirmasi')
  ringkasanRw(
    @Access() ctx: AccessContext,
    @Query('dari') dari?: string,
    @Query('sampai') sampai?: string,
  ) {
    if (ctx.scope !== 'ALL') {
      throw new ForbiddenException('Dashboard ini hanya untuk Bendahara RW.');
    }
    return this.dashboardRw.ringkasanRw(ctx, { dari, sampai });
  }
}
