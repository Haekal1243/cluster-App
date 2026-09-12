import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { WargaService } from './warga.service';
import { CreateWargaDto } from './dto/create-warga.dto';
import { UpdateWargaDto } from './dto/update-warga.dto';
import { CreateRumahDto } from './dto/create-rumah.dto';
import { UpdateRumahDto } from './dto/update-rumah.dto';
import { buktiMulterOptions } from './bukti.multer';

@Controller('warga')
export class WargaController {
  constructor(private readonly wargaService: WargaService) {}

  // -------------------------------------------------------
  // AUTH
  // -------------------------------------------------------
  @Post('login')
  login(@Body() body: { email: string; password: string }) {
    return this.wargaService.login(body.email, body.password);
  }

  // -------------------------------------------------------
  // USER / WARGA CRUD
  // -------------------------------------------------------
  @Post()
  create(@Body() createWargaDto: CreateWargaDto) {
    return this.wargaService.create(createWargaDto);
  }

  @Get()
  findAll() {
    return this.wargaService.findAll();
  }

  /** Dropdown: semua user WARGA untuk form Tambah/Edit Rumah */
  @Get('users')
  findAllUsers() {
    return this.wargaService.findAllUsers();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.wargaService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateWargaDto: UpdateWargaDto) {
    return this.wargaService.update(+id, updateWargaDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.wargaService.remove(+id);
  }

  // -------------------------------------------------------
  // RUMAH CRUD (Admin)
  // -------------------------------------------------------
  @Get('rumah/list')
  findAllRumah() {
    return this.wargaService.findAllRumah();
  }

  @Post('rumah')
  createRumah(@Body() dto: CreateRumahDto) {
    return this.wargaService.createRumah(dto);
  }

  @Patch('rumah/:id')
  updateRumah(@Param('id') id: string, @Body() dto: UpdateRumahDto) {
    return this.wargaService.updateRumah(+id, dto);
  }

  @Delete('rumah/:id')
  removeRumah(@Param('id') id: string) {
    return this.wargaService.removeRumah(+id);
  }

  // -------------------------------------------------------
  // PORTAL WARGA — endpoint untuk akun WARGA
  // -------------------------------------------------------

  /** GET /warga/portal/rumah/:userId — daftar rumah milik user */
  @Get('portal/rumah/:userId')
  getRumahByUser(@Param('userId') userId: string) {
    return this.wargaService.getRumahByUser(+userId);
  }

  /** GET /warga/portal/tagihan/:rumahId — tagihan IPL per rumah */
  @Get('portal/tagihan/:rumahId')
  getTagihanByRumah(@Param('rumahId') rumahId: string) {
    return this.wargaService.getTagihanByRumah(+rumahId);
  }

  /** POST /warga/portal/bayar — upload bukti pembayaran */
  @Post('portal/bayar')
  @UseInterceptors(FileInterceptor('file', buktiMulterOptions))
  uploadBuktiPembayaran(
    @Body() body: { idUser: string; idIpl: string; nominal: string },
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.wargaService.uploadBuktiPembayaran({
      idUser: +body.idUser,
      idIpl: +body.idIpl,
      nominal: +body.nominal,
      buktiTransaksi: file?.filename ?? '',
    });
  }
}