import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { KegiatanController } from './kegiatan.controller';
import { KegiatanService } from './kegiatan.service';
import { KegiatanFeedbackService } from './kegiatan-feedback.service';
import { NotifikasiModule } from '../notifikasi/notifikasi.module';

@Module({
  imports: [PrismaModule, NotifikasiModule],
  controllers: [KegiatanController],
  providers: [KegiatanService, KegiatanFeedbackService],
})
export class KegiatanModule {}
