import { IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { StatusPengaduan } from '@prisma/client';

export class RespondPengaduanDto {
  @IsIn(['DIPROSES', 'SELESAI', 'DITOLAK'])
  status!: StatusPengaduan;

  @IsString()
  @IsNotEmpty()
  tanggapan!: string;

  @IsString()
  @IsOptional()
  tanggapanBy?: string;
}
