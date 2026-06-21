import { Controller, Get, Post, Put, Delete, Param, Body } from '@nestjs/common';
import { WargaService } from './warga.service';

@Controller('warga')
export class WargaController {
  constructor(private readonly wargaService: WargaService) {}
  @Get() findAll() { return this.wargaService.findAll(); }
  @Get(':id') findOne(@Param('id') id: string) { return this.wargaService.findOne(+id); }
  @Post() create(@Body() body: any) { return this.wargaService.create(body); }
  @Put(':id') update(@Param('id') id: string, @Body() body: any) { return this.wargaService.update(+id, body); }
  @Delete(':id') remove(@Param('id') id: string) { return this.wargaService.remove(+id); }
}
