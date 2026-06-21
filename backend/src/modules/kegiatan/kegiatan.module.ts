import { Module } from '@nestjs/common';
import { KegiatanController } from './kegiatan.controller';
import { KegiatanService } from './kegiatan.service';
import { PrismaService } from '../../prisma/prisma.service';

@Module({ controllers: [KegiatanController], providers: [KegiatanService, PrismaService] })
export class KegiatanModule {}
