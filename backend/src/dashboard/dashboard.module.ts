import { Module } from '@nestjs/common';
import { DashboardRwController } from './dashboard.controller';
import { DashboardRwService } from './dashboard.service';

@Module({
  controllers: [DashboardRwController],
  providers: [DashboardRwService],
})
export class DashboardModule {}
