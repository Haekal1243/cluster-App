import { IsEnum, IsOptional, IsString } from 'class-validator';
import { StatusKegiatan } from '@prisma/client';

export class UpdateStatusKegiatanDto {
  @IsEnum(StatusKegiatan)
  status!: StatusKegiatan;

  @IsString()
  @IsOptional()
  updateBy?: string;
}
