import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  ParseIntPipe,
  Delete,
  UploadedFile,
  UseInterceptors,
  UseGuards,
  Query,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ThrottlerGuard } from '@nestjs/throttler';
import { WargaService } from './warga.service';
import { CreateWargaDto } from './dto/create-warga.dto';
import { UpdateWargaDto } from './dto/update-warga.dto';
import { CreateRumahDto } from './dto/create-rumah.dto';
import { UpdateRumahDto } from './dto/update-rumah.dto';
import { AkhiriKontrakDto, MulaiKontrakDto } from './dto/kontrak-rumah.dto';
import { DaftarMandiriDto } from './dto/daftar-mandiri.dto';
import { BayarIplDto } from './dto/bayar-ipl.dto';
import { SetujuiPendaftaranDto } from './dto/setujui-pendaftaran.dto';
import { TolakPendaftaranDto } from './dto/tolak-pendaftaran.dto';
import { AjukanHapusDto } from './dto/ajukan-hapus.dto';
import { buktiMulterOptions } from './bukti.multer';
import { Access, RequirePermission } from '../auth/permission.decorators';
import { Public } from '../auth/public.decorator';
import type { AccessContext } from '../auth/auth.types';

@Controller('warga')
export class WargaController {
  constructor(private readonly wargaService: WargaService) {}

  @Post()
  @RequirePermission('warga', 'create')
  create(@Access() ctx: AccessContext, @Body() dto: CreateWargaDto) {
    return this.wargaService.create(ctx, dto);
  }

  @Get()
  @RequirePermission('warga', 'read')
  findAll(
    @Access() ctx: AccessContext,
    @Query('search') search?: string,
    @Query('rt') rt?: string,
  ) {
    return this.wargaService.findAll(ctx, { search, rt });
  }

  @Get('username/saran')
  @RequirePermission('warga', 'read')
  async saranUsername(
    @Query('nama') nama?: string,
    @Query('noHp') noHp?: string,
    @Query('abaikanId') abaikanId?: string,
  ) {
    return { username: await this.wargaService.saranUsername(nama ?? '', noHp, abaikanId ? +abaikanId : undefined) };
  }

  @Get('username/cek')
  @RequirePermission('warga', 'read')
  async cekUsername(@Query('username') username?: string, @Query('abaikanId') abaikanId?: string) {
    return { tersedia: await this.wargaService.usernameTersedia(username ?? '', abaikanId ? +abaikanId : undefined) };
  }

  @Get('users')
  @RequirePermission('warga', 'read')
  findAllUsers(@Access() ctx: AccessContext) {
    return this.wargaService.findAllUsers(ctx);
  }

  @Get('rumah/list')
  @RequirePermission('rumah', 'read')
  findAllRumah(@Access() ctx: AccessContext) {
    return this.wargaService.findAllRumah(ctx);
  }

  @Post('rumah')
  @RequirePermission('rumah', 'create')
  createRumah(@Access() ctx: AccessContext, @Body() dto: CreateRumahDto) {
    return this.wargaService.createRumah(ctx, dto);
  }

  @Patch('rumah/:id')
  @RequirePermission('rumah', 'update')
  updateRumah(
    @Access() ctx: AccessContext,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateRumahDto,
  ) {
    return this.wargaService.updateRumah(ctx, id, dto);
  }

  @Post('rumah/:id/kontrak')
  @RequirePermission('rumah', 'kontrak')
  mulaiKontrak(
    @Access() ctx: AccessContext,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: MulaiKontrakDto,
  ) {
    return this.wargaService.mulaiKontrak(ctx, id, dto);
  }

  @Delete('rumah/:id/kontrak')
  @RequirePermission('rumah', 'kontrak')
  akhiriKontrak(
    @Access() ctx: AccessContext,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AkhiriKontrakDto,
  ) {
    return this.wargaService.akhiriKontrak(ctx, id, dto);
  }

  @Delete('rumah/:id')
  @RequirePermission('rumah', 'delete')
  removeRumah(@Access() ctx: AccessContext, @Param('id', ParseIntPipe) id: number) {
    return this.wargaService.removeRumah(ctx, id);
  }


  @Get('portal/rumah/:userId')
  @RequirePermission('ipl', 'read')
  getRumahByUser(@Access() ctx: AccessContext, @Param('userId', ParseIntPipe) userId: number) {
    return this.wargaService.getRumahByUser(ctx, userId);
  }

  @Get('portal/tagihan/user/:userId')
  @RequirePermission('ipl', 'read')
  getTagihanByUser(
    @Access() ctx: AccessContext,
    @Param('userId', ParseIntPipe) userId: number,
    @Query('bulan') bulan?: string,
    @Query('tahun') tahun?: string,
    @Query('dari') dari?: string,
    @Query('sampai') sampai?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    return this.wargaService.getTagihanByUser(ctx, userId, {
      bulan,
      tahun,
      dari,
      sampai,
      status,
      search,
    });
  }

  @Get('portal/tagihan/:rumahId')
  @RequirePermission('ipl', 'read')
  getTagihanByRumah(@Access() ctx: AccessContext, @Param('rumahId', ParseIntPipe) rumahId: number) {
    return this.wargaService.getTagihanByRumah(ctx, rumahId);
  }

  @Post('portal/bayar')
  @RequirePermission('ipl', 'bayar')
  @UseInterceptors(FileInterceptor('file', buktiMulterOptions))
  uploadBuktiPembayaran(
    @Access() ctx: AccessContext,
    @Body() body: BayarIplDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.wargaService.uploadBuktiPembayaran(ctx, { idIpl: body.idIpl, bukti: file });
  }


  @Public()
  @Get('rumah-kosong')
  getRumahKosong(@Query('rt') rt: string) {
    return this.wargaService.getRumahKosong(rt);
  }

  @Public()
  @UseGuards(ThrottlerGuard)
  @Post('daftar')
  daftarMandiri(@Body() dto: DaftarMandiriDto) {
    return this.wargaService.daftarMandiri(dto);
  }

  @Get('pendaftaran')
  @RequirePermission('warga', 'approve_registrasi')
  getPendaftaran(@Access() ctx: AccessContext, @Query('status') status?: string) {
    return this.wargaService.getPendaftaran(ctx, status);
  }

  @Patch('pendaftaran/:id/setuju')
  @RequirePermission('warga', 'approve_registrasi')
  setujuiPendaftaran(
    @Access() ctx: AccessContext,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto?: SetujuiPendaftaranDto,
  ) {
    return this.wargaService.setujuiPendaftaran(ctx, id, dto?.status);
  }

  @Patch('pendaftaran/:id/tolak')
  @RequirePermission('warga', 'approve_registrasi')
  tolakPendaftaran(
    @Access() ctx: AccessContext,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: TolakPendaftaranDto,
  ) {
    return this.wargaService.tolakPendaftaran(ctx, id, dto.alasan);
  }

  @Get('pengajuan-hapus')
  @RequirePermission('warga', 'read')
  getPengajuanHapus(@Access() ctx: AccessContext, @Query('status') status?: string) {
    return this.wargaService.getPengajuanHapus(ctx, status);
  }

  @Patch('pengajuan-hapus/:id/setuju')
  @RequirePermission('warga', 'approve_hapus')
  setujuiHapus(@Access() ctx: AccessContext, @Param('id', ParseIntPipe) id: number) {
    return this.wargaService.setujuiHapus(ctx, id);
  }

  @Patch('pengajuan-hapus/:id/tolak')
  @RequirePermission('warga', 'approve_hapus')
  tolakHapus(
    @Access() ctx: AccessContext,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: TolakPendaftaranDto,
  ) {
    return this.wargaService.tolakHapus(ctx, id, dto.alasan);
  }

  @Get(':id')
  @RequirePermission('warga', 'read')
  findOne(@Access() ctx: AccessContext, @Param('id', ParseIntPipe) id: number) {
    return this.wargaService.findOne(ctx, id);
  }

  @Patch(':id')
  @RequirePermission('warga', 'update')
  update(
    @Access() ctx: AccessContext,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateWargaDto,
  ) {
    return this.wargaService.update(ctx, id, dto);
  }

  @Delete(':id')
  @RequirePermission('warga', 'delete')
  remove(@Access() ctx: AccessContext, @Param('id', ParseIntPipe) id: number) {
    return this.wargaService.remove(ctx, id);
  }

  @Post(':id/ajukan-hapus')
  @RequirePermission('warga', 'ajukan_hapus')
  ajukanHapus(
    @Access() ctx: AccessContext,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AjukanHapusDto,
  ) {
    return this.wargaService.ajukanHapus(ctx, id, dto.alasan);
  }

  @Post(':id/reset-password')
  @RequirePermission('warga', 'reset_password')
  resetPassword(@Access() ctx: AccessContext, @Param('id', ParseIntPipe) id: number) {
    return this.wargaService.resetPassword(ctx, id);
  }
}
