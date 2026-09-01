import { IsEnum, IsOptional, IsString } from 'class-validator';
import { StatusPengumuman } from '@prisma/client';

export class UpdateStatusPengumumanDto {
  @IsEnum(StatusPengumuman)
  status!: StatusPengumuman;

  @IsString()
  @IsOptional()
  updateBy?: string;
}
