import { Module } from '@nestjs/common';
import { IplController } from './ipl.controller';
import { IplService } from './ipl.service';
import { PrismaService } from '../../prisma/prisma.service';

@Module({ controllers: [IplController], providers: [IplService, PrismaService] })
export class IplModule {}
