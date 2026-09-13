import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { IplService } from './ipl.service';
import { GenerateIplDto } from './dto/generate-ipl.dto';
import { KonfirmasiIplDto } from './dto/konfirmasi-ipl.dto';

@Controller('ipl')
export class IplController {
  constructor(private readonly iplService: IplService) {}

  /** POST /ipl/generate — Generate tagihan massal untuk semua rumah aktif */
  @Post('generate')
  generateTagihan(@Body() dto: GenerateIplDto) {
    return this.iplService.generateTagihan(dto);
  }

  /** GET /ipl/dashboard-stats — Statistik ringkasan untuk widget dashboard */
  @Get('dashboard-stats')
  getDashboardStats() {
    return this.iplService.getDashboardStats();
  }

  /** GET /ipl — Daftar tagihan IPL dengan filter opsional */
  @Get()
  findAll(
    @Query('bulan') bulan?: string,
    @Query('tahun') tahun?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    return this.iplService.findAll({ bulan, tahun, status, search });
  }

  /** PATCH /ipl/konfirmasi/:pembayaranId — Konfirmasi atau tolak bukti pembayaran */
  @Patch('konfirmasi/:pembayaranId')
  konfirmasiPembayaran(
    @Param('pembayaranId', ParseIntPipe) pembayaranId: number,
    @Body() dto: KonfirmasiIplDto,
  ) {
    return this.iplService.konfirmasiPembayaran(pembayaranId, dto);
  }
}
