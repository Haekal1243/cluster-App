import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { PengumumanController } from './pengumuman.controller';
import { PengumumanService } from './pengumuman.service';

@Module({
  imports: [PrismaModule],
  controllers: [PengumumanController],
  providers: [PengumumanService],
})
export class PengumumanModule {}
