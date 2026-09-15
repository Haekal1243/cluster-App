import { Controller, Get, Param, Patch, Req } from '@nestjs/common';
import { Request } from 'express';
import { NotifikasiService } from './notifikasi.service';

interface JwtPayload {
  sub: number;
  email: string;
  role: string;
}

type AuthedRequest = Request & { user: JwtPayload };

@Controller('notifikasi')
export class NotifikasiController {
  constructor(private readonly notifikasiService: NotifikasiService) {}

  @Get()
  findMine(@Req() req: AuthedRequest) {
    return this.notifikasiService.findByUser(req.user.sub);
  }

  @Patch(':id/read')
  markRead(@Param('id') id: string, @Req() req: AuthedRequest) {
    return this.notifikasiService.markRead(+id, req.user.sub);
  }

  @Patch('read-all')
  markAllRead(@Req() req: AuthedRequest) {
    return this.notifikasiService.markAllRead(req.user.sub);
  }
}
