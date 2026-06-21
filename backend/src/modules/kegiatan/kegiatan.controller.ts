import { Controller, Get, Post, Delete, Param, Body } from '@nestjs/common';
import { KegiatanService } from './kegiatan.service';

@Controller('kegiatan')
export class KegiatanController {
  constructor(private readonly kegiatanService: KegiatanService) {}
  @Get() findAll() { return this.kegiatanService.findAll(); }
  @Get(':id') findOne(@Param('id') id: string) { return this.kegiatanService.findOne(+id); }
  @Post() create(@Body() body: any) { return this.kegiatanService.create(body); }
  @Delete(':id') remove(@Param('id') id: string) { return this.kegiatanService.remove(+id); }
}
