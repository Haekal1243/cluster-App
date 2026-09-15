import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { PengaduanController } from './pengaduan.controller';
import { PengaduanService } from './pengaduan.service';
import { NotifikasiModule } from '../notifikasi/notifikasi.module';

@Module({
  imports: [PrismaModule, NotifikasiModule],
  controllers: [PengaduanController],
  providers: [PengaduanService],
})
export class PengaduanModule {}
