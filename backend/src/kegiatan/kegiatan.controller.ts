import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CreateKegiatanDto } from './dto/create-kegiatan.dto';
import { UpdateKegiatanDto } from './dto/update-kegiatan.dto';
import { UpdateStatusKegiatanDto } from './dto/update-status-kegiatan.dto';
import { kegiatanMulterOptions } from './kegiatan.multer';
import { KegiatanService } from './kegiatan.service';

@Controller('kegiatan')
export class KegiatanController {
  constructor(private readonly kegiatanService: KegiatanService) {}

  @Post()
  @UseInterceptors(FileInterceptor('file', kegiatanMulterOptions))
  create(
    @Body() createKegiatanDto: CreateKegiatanDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.kegiatanService.create(createKegiatanDto, file);
  }

  @Get()
  findAll() {
    return this.kegiatanService.findAll();
  }

  @Get('active')
  findActive() {
    return this.kegiatanService.findActive();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.kegiatanService.findOne(+id);
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body() updateStatusDto: UpdateStatusKegiatanDto,
  ) {
    return this.kegiatanService.updateStatus(+id, updateStatusDto);
  }

  @Patch(':id')
  @UseInterceptors(FileInterceptor('file', kegiatanMulterOptions))
  update(
    @Param('id') id: string,
    @Body() updateKegiatanDto: UpdateKegiatanDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.kegiatanService.update(+id, updateKegiatanDto, file);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.kegiatanService.remove(+id);
  }
}
