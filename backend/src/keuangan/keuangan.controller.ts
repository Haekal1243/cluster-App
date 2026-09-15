import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { KeuanganService } from './keuangan.service';
import { CreateKasDto } from './dto/create-kas.dto';
import { UpdateKasDto } from './dto/update-kas.dto';
import { keuanganMulterOptions } from './keuangan.multer';

@Controller('keuangan')
export class KeuanganController {
  constructor(private readonly keuanganService: KeuanganService) {}

  /** POST /keuangan — Catat transaksi kas manual (bukti opsional) */
  @Post()
  @UseInterceptors(FileInterceptor('bukti', keuanganMulterOptions))
  create(
    @Body() dto: CreateKasDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.keuanganService.create(dto, file);
  }

  /** GET /keuangan/ringkasan — Ringkasan IPL otomatis + kas manual */
  @Get('ringkasan')
  getRingkasan(
    @Query('dari') dari?: string,
    @Query('sampai') sampai?: string,
  ) {
    return this.keuanganService.getRingkasan({ dari, sampai });
  }

  /** GET /keuangan — Riwayat transaksi kas manual dengan filter opsional */
  @Get()
  findAll(
    @Query('dari') dari?: string,
    @Query('sampai') sampai?: string,
    @Query('tipe') tipe?: string,
    @Query('kategori') kategori?: string,
    @Query('search') search?: string,
  ) {
    return this.keuanganService.findAll({ dari, sampai, tipe, kategori, search });
  }

  /** GET /keuangan/:id — Detail satu transaksi */
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.keuanganService.findOne(+id);
  }

  /** PATCH /keuangan/:id — Perbarui transaksi */
  @Patch(':id')
  @UseInterceptors(FileInterceptor('bukti', keuanganMulterOptions))
  update(
    @Param('id') id: string,
    @Body() dto: UpdateKasDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.keuanganService.update(+id, dto, file);
  }

  /** DELETE /keuangan/:id — Hapus transaksi */
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.keuanganService.remove(+id);
  }
}
