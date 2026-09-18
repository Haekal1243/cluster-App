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
import { CreatePengumumanDto } from './dto/create-pengumuman.dto';
import { UpdatePengumumanDto } from './dto/update-pengumuman.dto';
import { UpdateStatusPengumumanDto } from './dto/update-status-pengumuman.dto';
import { pengumumanMulterOptions } from './pengumuman.multer';
import { PengumumanService } from './pengumuman.service';
import { Public } from '../auth/public.decorator';

@Controller('pengumuman')
export class PengumumanController {
  constructor(private readonly pengumumanService: PengumumanService) {}

  @Post()
  @UseInterceptors(FileInterceptor('file', pengumumanMulterOptions))
  create(
    @Body() createPengumumanDto: CreatePengumumanDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.pengumumanService.create(createPengumumanDto, file);
  }

  @Get()
  findAll() {
    return this.pengumumanService.findAll();
  }

  @Public()
  @Get('active')
  findActive(@Query('scope') scope?: string) {
    return this.pengumumanService.findActive(scope as 'aktif' | 'arsip' | undefined);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.pengumumanService.findOne(+id);
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body() updateStatusDto: UpdateStatusPengumumanDto,
  ) {
    return this.pengumumanService.updateStatus(+id, updateStatusDto);
  }

  @Patch(':id')
  @UseInterceptors(FileInterceptor('file', pengumumanMulterOptions))
  update(
    @Param('id') id: string,
    @Body() updatePengumumanDto: UpdatePengumumanDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.pengumumanService.update(+id, updatePengumumanDto, file);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.pengumumanService.remove(+id);
  }
}
