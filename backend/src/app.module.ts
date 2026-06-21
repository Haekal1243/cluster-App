import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { WargaModule } from './warga/warga.module';

@Module({
  imports: [PrismaModule, WargaModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
