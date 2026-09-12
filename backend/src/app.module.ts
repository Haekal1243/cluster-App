import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { WargaModule } from './warga/warga.module';
import { PengumumanModule } from './pengumuman/pengumuman.module';
import { KegiatanModule } from './kegiatan/kegiatan.module';

@Module({
  imports: [PrismaModule, WargaModule, PengumumanModule, KegiatanModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
