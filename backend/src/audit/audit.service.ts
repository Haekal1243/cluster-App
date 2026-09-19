import { Global, Injectable, Module } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  /** Catat aksi sensitif. Kegagalan mencatat tidak boleh menggagalkan aksinya. */
  async catat(
    idUser: number | null,
    aksi: string,
    detail: { target?: string; targetId?: number; keterangan?: string } = {},
  ) {
    try {
      await this.prisma.auditLog.create({
        data: { idUser, aksi, ...detail },
      });
    } catch (err) {
      console.error('[audit] gagal mencatat', aksi, err);
    }
  }
}

@Global()
@Module({
  providers: [AuditService],
  exports: [AuditService],
})
export class AuditModule {}
