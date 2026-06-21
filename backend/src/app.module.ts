import { Module } from '@nestjs/common';
import { AuthModule } from './modules/auth/auth.module';
import { WargaModule } from './modules/warga/warga.module';
import { IplModule } from './modules/ipl/ipl.module';
import { KegiatanModule } from './modules/kegiatan/kegiatan.module';

@Module({ imports: [AuthModule, WargaModule, IplModule, KegiatanModule] })
export class AppModule {}
