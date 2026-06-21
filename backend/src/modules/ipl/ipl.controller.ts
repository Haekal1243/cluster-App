import { Controller, Get, Post, Put, Delete, Param, Body } from '@nestjs/common';
import { IplService } from './ipl.service';

@Controller('ipl')
export class IplController {
  constructor(private readonly iplService: IplService) {}
  @Get() findAll() { return this.iplService.findAll(); }
  @Get(':id') findOne(@Param('id') id: string) { return this.iplService.findOne(+id); }
  @Post() create(@Body() body: any) { return this.iplService.create(body); }
  @Put(':id') update(@Param('id') id: string, @Body() body: any) { return this.iplService.update(+id, body); }
  @Delete(':id') remove(@Param('id') id: string) { return this.iplService.remove(+id); }
}
