import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { Area } from '@prisma/client';
import { RbacService } from './rbac.service';
import { PengurusService } from './pengurus.service';
import {
  AssignPengurusDto,
  CreateRoleDto,
  SetRolePermissionsDto,
  UpdateRoleDto,
  VacatePengurusDto,
} from './rbac.dto';
import { CurrentUser, RequirePermission } from '../auth/permission.decorators';
import type { AuthUser } from '../auth/auth.types';

/** Menu admin "Role & Permission": matriks hak akses seluruhnya disimpan di database. */
@Controller('rbac')
@RequirePermission('role', 'manage')
export class RbacController {
  constructor(private readonly rbacService: RbacService) {}

  /** Role x permission x scope dalam satu panggilan, untuk menggambar matriks. */
  @Get('matrix')
  matrix() {
    return this.rbacService.matrix();
  }

  @Get('roles')
  listRoles() {
    return this.rbacService.listRoles();
  }

  @Post('roles')
  createRole(@CurrentUser() user: AuthUser, @Body() dto: CreateRoleDto) {
    return this.rbacService.createRole(user, dto);
  }

  @Patch('roles/:id')
  updateRole(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateRoleDto,
  ) {
    return this.rbacService.updateRole(user, id, dto);
  }

  @Delete('roles/:id')
  removeRole(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number) {
    return this.rbacService.removeRole(user, id);
  }

  @Get('permissions')
  listPermissions() {
    return this.rbacService.listPermissions();
  }

  @Get('roles/:id/permissions')
  getRolePermissions(@Param('id', ParseIntPipe) id: number) {
    return this.rbacService.getRolePermissions(id);
  }

  /** Ganti seluruh permission sebuah role (dipakai tombol "Simpan" di matriks). */
  @Put('roles/:id/permissions')
  setRolePermissions(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SetRolePermissionsDto,
  ) {
    return this.rbacService.setRolePermissions(user, id, dto);
  }

  @Get('audit')
  audit(@Query('limit') limit?: string) {
    return this.rbacService.auditLog(limit ? +limit : 100);
  }
}

/** Menu admin "Pengurus": tetapkan siapa yang jadi ketua/bendahara/sekre di RW dan tiap RT. */
@Controller('pengurus')
@RequirePermission('pengurus', 'manage')
export class PengurusController {
  constructor(private readonly pengurusService: PengurusService) {}

  @Get()
  slots() {
    return this.pengurusService.slots();
  }

  @Get('kandidat')
  kandidat(@Query('area') area?: Area) {
    return this.pengurusService.kandidat(area);
  }

  @Post('tetapkan')
  assign(@CurrentUser() user: AuthUser, @Body() dto: AssignPengurusDto) {
    return this.pengurusService.assign(user, dto);
  }

  @Post('kosongkan')
  vacate(@CurrentUser() user: AuthUser, @Body() dto: VacatePengurusDto) {
    return this.pengurusService.vacate(user, dto);
  }
}
