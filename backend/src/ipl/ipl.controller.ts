import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { IplService } from './ipl.service';
import { FileService } from '../common/file/file.service';
import { GenerateIplDto } from './dto/generate-ipl.dto';
import { UpdateIplDto } from './dto/update-ipl.dto';
import { KonfirmasiIplDto } from './dto/konfirmasi-ipl.dto';
import { Access, CurrentUser, RequirePermission } from '../auth/permission.decorators';
import type { AccessContext, AuthUser } from '../auth/auth.types';

@Controller('ipl')
export class IplController {
  constructor(
    private readonly iplService: IplService,
    private readonly files: FileService,
  ) {}

  @Post('generate')
  @RequirePermission('ipl', 'generate')
  generateTagihan(@Access() ctx: AccessContext, @Body() dto: GenerateIplDto) {
    return this.iplService.generateTagihan(ctx, dto);
  }

  @Get('dashboard-stats')
  @RequirePermission('ipl', 'read')
  getDashboardStats(
    @Access() ctx: AccessContext,
    @Query('dari') dari?: string,
    @Query('sampai') sampai?: string,
    @Query('rt') rt?: string,
  ) {
    return this.iplService.getDashboardStats(ctx, { dari, sampai, rt });
  }

  @Get('rekap-rt')
  @RequirePermission('ipl', 'read')
  rekapPerRt(
    @Access() ctx: AccessContext,
    @Query('dari') dari?: string,
    @Query('sampai') sampai?: string,
    @Query('status') status?: string,
    @Query('rt') rt?: string,
  ) {
    return this.iplService.rekapPerRt(ctx, { dari, sampai, status, rt });
  }

  @Get()
  @RequirePermission('ipl', 'read')
  findAll(
    @Access() ctx: AccessContext,
    @Query('bulan') bulan?: string,
    @Query('tahun') tahun?: string,
    @Query('dari') dari?: string,
    @Query('sampai') sampai?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('rt') rt?: string,
  ) {
    return this.iplService.findAll(ctx, { bulan, tahun, dari, sampai, status, search, rt });
  }

  @Get('pembayaran/:id/bukti')
  @RequirePermission('ipl', 'read')
  async bukti(
    @Access() ctx: AccessContext,
    @Param('id', ParseIntPipe) id: number,
    @Res() res: Response,
  ) {
    await this.files.kirim(res, await this.iplService.fileIdBukti(ctx, id));
  }

  @Patch('konfirmasi/:pembayaranId')
  konfirmasiPembayaran(
    @CurrentUser() user: AuthUser,
    @Param('pembayaranId', ParseIntPipe) pembayaranId: number,
    @Body() dto: KonfirmasiIplDto,
  ) {
    return this.iplService.konfirmasiPembayaran(user, pembayaranId, dto);
  }

  @Patch(':id')
  @RequirePermission('ipl', 'update')
  update(
    @Access() ctx: AccessContext,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateIplDto,
  ) {
    return this.iplService.update(ctx, id, dto);
  }

  @Delete(':id')
  @RequirePermission('ipl', 'delete')
  remove(@Access() ctx: AccessContext, @Param('id', ParseIntPipe) id: number) {
    return this.iplService.remove(ctx, id);
  }
}
