import { Module } from '@nestjs/common';
import { CatatanRapatController } from './catatan-rapat.controller';
import { CatatanRapatService } from './catatan-rapat.service';

@Module({
  controllers: [CatatanRapatController],
  providers: [CatatanRapatService],
})
export class CatatanRapatModule {}
