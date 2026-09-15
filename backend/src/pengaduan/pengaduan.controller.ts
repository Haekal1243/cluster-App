import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Request } from 'express';
import { CreatePengaduanDto } from './dto/create-pengaduan.dto';
import { RespondPengaduanDto } from './dto/respond-pengaduan.dto';
import { pengaduanMulterOptions } from './pengaduan.multer';
import { PengaduanService } from './pengaduan.service';

interface JwtPayload {
  sub: number;
  email: string;
  role: string;
}

type AuthedRequest = Request & { user: JwtPayload };

@Controller('pengaduan')
export class PengaduanController {
  constructor(private readonly pengaduanService: PengaduanService) {}

  @Post()
  @UseInterceptors(FileInterceptor('file', pengaduanMulterOptions))
  create(
    @Body() dto: CreatePengaduanDto,
    @Req() req: AuthedRequest,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.pengaduanService.create(req.user.sub, dto, file);
  }

  @Get()
  findAll(@Req() req: AuthedRequest) {
    if (req.user.role === 'WARGA') {
      throw new ForbiddenException('Anda tidak berhak melihat semua pengaduan');
    }
    return this.pengaduanService.findAll();
  }

  /** GET /pengaduan/user/:userId — daftar pengaduan milik satu warga */
  @Get('user/:userId')
  findByUser(@Param('userId') userId: string, @Req() req: AuthedRequest) {
    if (req.user.role === 'WARGA' && req.user.sub !== +userId) {
      throw new ForbiddenException('Anda tidak berhak melihat pengaduan warga lain');
    }
    return this.pengaduanService.findByUser(+userId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: AuthedRequest) {
    return this.pengaduanService.findOne(+id, req.user);
  }

  @Patch(':id/respond')
  respond(
    @Param('id') id: string,
    @Body() dto: RespondPengaduanDto,
    @Req() req: AuthedRequest,
  ) {
    if (req.user.role === 'WARGA') {
      throw new ForbiddenException('Warga tidak dapat menanggapi pengaduan');
    }
    return this.pengaduanService.respond(+id, dto);
  }
}
