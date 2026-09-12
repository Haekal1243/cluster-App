import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { KegiatanController } from './kegiatan.controller';
import { KegiatanService } from './kegiatan.service';

@Module({
  imports: [PrismaModule],
  controllers: [KegiatanController],
  providers: [KegiatanService],
})
export class KegiatanModule {}
