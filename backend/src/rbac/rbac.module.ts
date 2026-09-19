import { Module } from '@nestjs/common';
import { PengurusController, RbacController } from './rbac.controller';
import { RbacService } from './rbac.service';
import { PengurusService } from './pengurus.service';

@Module({
  controllers: [RbacController, PengurusController],
  providers: [RbacService, PengurusService],
})
export class RbacModule {}
