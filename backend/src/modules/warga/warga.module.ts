import { Module } from '@nestjs/common';
import { WargaController } from './warga.controller';
import { WargaService } from './warga.service';
import { PrismaService } from '../../prisma/prisma.service';

@Module({ controllers: [WargaController], providers: [WargaService, PrismaService] })
export class WargaModule {}
