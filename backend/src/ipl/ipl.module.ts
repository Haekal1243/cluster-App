import { Module } from '@nestjs/common';
import { IplController } from './ipl.controller';
import { IplService } from './ipl.service';
import { PrismaModule } from '../prisma/prisma.module';
import { NotifikasiModule } from '../notifikasi/notifikasi.module';
import { PengingatIplService } from './pengingat-ipl.service';

@Module({
  imports: [PrismaModule, NotifikasiModule],
  controllers: [IplController],
  providers: [IplService, PengingatIplService],
  exports: [IplService],
})
export class IplModule {}
