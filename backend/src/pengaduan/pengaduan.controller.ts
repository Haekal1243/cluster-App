import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CreatePengaduanDto } from './dto/create-pengaduan.dto';
import { RespondPengaduanDto } from './dto/respond-pengaduan.dto';
import { pengaduanMulterOptions } from './pengaduan.multer';
import { PengaduanService } from './pengaduan.service';
import { Access, CurrentUser, RequirePermission } from '../auth/permission.decorators';
import type { AccessContext, AuthUser } from '../auth/auth.types';

@Controller('pengaduan')
export class PengaduanController {
  constructor(private readonly pengaduanService: PengaduanService) {}

  @Post()
  @UseInterceptors(FileInterceptor('file', pengaduanMulterOptions))
  create(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreatePengaduanDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.pengaduanService.create(user, dto, file);
  }

  @Get()
  @RequirePermission('pengaduan', 'read')
  findAll(@Access() ctx: AccessContext) {
    return this.pengaduanService.findAll(ctx);
  }

  @Get('user/:userId')
  @RequirePermission('pengaduan', 'read')
  findByUser(@Access() ctx: AccessContext, @Param('userId', ParseIntPipe) userId: number) {
    return this.pengaduanService.findByUser(ctx, userId);
  }

  @Get('tujuan')
  getTujuanPilihan(@CurrentUser() user: AuthUser) {
    return this.pengaduanService.getTujuanPilihan(user);
  }

  @Get(':id')
  @RequirePermission('pengaduan', 'read')
  findOne(@Access() ctx: AccessContext, @Param('id', ParseIntPipe) id: number) {
    return this.pengaduanService.findOne(ctx, id);
  }

  @Patch(':id/respond')
  @RequirePermission('pengaduan', 'respon')
  respond(
    @Access() ctx: AccessContext,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RespondPengaduanDto,
  ) {
    return this.pengaduanService.respond(ctx, id, dto);
  }
}
