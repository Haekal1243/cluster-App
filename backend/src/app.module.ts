import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { WargaModule } from './warga/warga.module';
import { PengumumanModule } from './pengumuman/pengumuman.module';
import { KegiatanModule } from './kegiatan/kegiatan.module';
import { IplModule } from './ipl/ipl.module';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { PengaduanModule } from './pengaduan/pengaduan.module';
import { NotifikasiModule } from './notifikasi/notifikasi.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    NotifikasiModule,
    WargaModule,
    PengumumanModule,
    KegiatanModule,
    IplModule,
    PengaduanModule,
  ],
  controllers: [AppController],
  providers: [AppService, { provide: APP_GUARD, useClass: JwtAuthGuard }],
})
export class AppModule {}

