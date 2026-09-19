import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { RT } from '@prisma/client';
import { SetoranService } from './setoran.service';
import { CreateSetoranDto, KonfirmasiSetoranDto } from './dto/setoran.dto';
import { setoranMulterOptions } from './setoran.multer';
import { Access, RequirePermission } from '../auth/permission.decorators';
import type { AccessContext } from '../auth/auth.types';

@Controller('setoran')
export class SetoranController {
  constructor(private readonly setoranService: SetoranService) {}

  /** GET /setoran/siap-setor — pratinjau total porsi IPL yang belum disetor */
  @Get('siap-setor')
  @RequirePermission('setoran', 'create')
  siapSetor(@Access() ctx: AccessContext, @Query('rt') rt?: RT) {
    return this.setoranService.siapSetor(ctx, rt);
  }

  /** POST /setoran — setor semua porsi IPL lunas yang belum disetor (multipart: bukti) */
  @Post()
  @RequirePermission('setoran', 'create')
  @UseInterceptors(FileInterceptor('bukti', setoranMulterOptions))
  create(
    @Access() ctx: AccessContext,
    @Body() dto: CreateSetoranDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.setoranService.create(ctx, dto.rt, file);
  }

  @Get()
  @RequirePermission('setoran', 'read')
  findAll(
    @Access() ctx: AccessContext,
    @Query('status') status?: string,
    @Query('rt') rt?: string,
  ) {
    return this.setoranService.findAll(ctx, { status, rt });
  }

  @Get(':id')
  @RequirePermission('setoran', 'read')
  findOne(@Access() ctx: AccessContext, @Param('id', ParseIntPipe) id: number) {
    return this.setoranService.findOne(ctx, id);
  }

  /** PATCH /setoran/:id/konfirmasi — bendahara RW menerima/menolak setoran */
  @Patch(':id/konfirmasi')
  @RequirePermission('setoran', 'konfirmasi')
  konfirmasi(
    @Access() ctx: AccessContext,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: KonfirmasiSetoranDto,
  ) {
    return this.setoranService.konfirmasi(ctx, id, dto);
  }
}
