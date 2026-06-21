// src/warga/warga.module.ts
import { Module } from '@nestjs/common';
import { WargaService } from './warga.service';
import { WargaController } from './warga.controller';
import { PrismaModule } from '../prisma/prisma.module'; 

@Module({
  imports: [PrismaModule], 
  controllers: [WargaController],
  providers: [WargaService],
})
export class WargaModule {}