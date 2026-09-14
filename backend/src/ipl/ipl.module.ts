import { Module } from '@nestjs/common';
import { IplController } from './ipl.controller';
import { IplService } from './ipl.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [IplController],
  providers: [IplService],
  exports: [IplService],
})
export class IplModule {}
