import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuditModule } from './audit/audit.service';
import { WargaModule } from './warga/warga.module';
import { PengumumanModule } from './pengumuman/pengumuman.module';
import { KegiatanModule } from './kegiatan/kegiatan.module';
import { IplModule } from './ipl/ipl.module';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { PermissionGuard } from './auth/permission.guard';
import { PengaduanModule } from './pengaduan/pengaduan.module';
import { NotifikasiModule } from './notifikasi/notifikasi.module';
import { KeuanganModule } from './keuangan/keuangan.module';
import { SetoranModule } from './setoran/setoran.module';
import { CatatanRapatModule } from './catatan-rapat/catatan-rapat.module';
import { RbacModule } from './rbac/rbac.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    // Job auto-teruskan pengaduan RT yang tidak ditanggapi 7 hari (PengaduanService).
    ScheduleModule.forRoot(),
    PrismaModule,
    AuditModule,
    AuthModule,
    RbacModule,
    NotifikasiModule,
    WargaModule,
    PengumumanModule,
    KegiatanModule,
    IplModule,
    SetoranModule,
    PengaduanModule,
    KeuanganModule,
    CatatanRapatModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Urutan penting: login dulu (JwtAuthGuard), baru cek permission (PermissionGuard).
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: PermissionGuard },
  ],
})
export class AppModule {}
