import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { NotifikasiController } from './notifikasi.controller';
import { NotifikasiService } from './notifikasi.service';

@Module({
  imports: [PrismaModule],
  controllers: [NotifikasiController],
  providers: [NotifikasiService],
  exports: [NotifikasiService],
})
export class NotifikasiModule {}
