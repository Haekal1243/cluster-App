import { IsEnum, IsOptional } from 'class-validator';
import { StatusRumah } from '@prisma/client';

export class SetujuiPendaftaranDto {
  @IsOptional()
  @IsEnum(StatusRumah)
  status?: StatusRumah;
}
