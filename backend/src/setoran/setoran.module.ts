import { Module } from '@nestjs/common';
import { SetoranController } from './setoran.controller';
import { SetoranService } from './setoran.service';
import { NotifikasiModule } from '../notifikasi/notifikasi.module';

@Module({
  imports: [NotifikasiModule],
  controllers: [SetoranController],
  providers: [SetoranService],
})
export class SetoranModule {}
