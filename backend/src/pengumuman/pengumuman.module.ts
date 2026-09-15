import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { PengumumanController } from './pengumuman.controller';
import { PengumumanService } from './pengumuman.service';
import { NotifikasiModule } from '../notifikasi/notifikasi.module';

@Module({
  imports: [PrismaModule, NotifikasiModule],
  controllers: [PengumumanController],
  providers: [PengumumanService],
})
export class PengumumanModule {}
