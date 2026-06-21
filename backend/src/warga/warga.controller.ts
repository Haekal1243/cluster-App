import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { WargaService } from './warga.service';
import { CreateWargaDto } from './dto/create-warga.dto';
import { UpdateWargaDto } from './dto/update-warga.dto';

@Controller('warga')
export class WargaController {
  constructor(private readonly wargaService: WargaService) {}

  @Post()
  create(@Body() createWargaDto: CreateWargaDto) {
    return this.wargaService.create(createWargaDto);
  }

  @Get()
  findAll() {
    return this.wargaService.findAll();
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
}
