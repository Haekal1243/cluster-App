import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { StatusPengumuman } from '@prisma/client';

export class CreatePengumumanDto {
  @IsString()
  @IsNotEmpty()
  judul!: string;

  @IsString()
  @IsOptional()
  keteranganPengumuman?: string;

  @IsEnum(StatusPengumuman)
  @IsOptional()
  status?: StatusPengumuman;

  @IsString()
  @IsOptional()
  createBy?: string;
}
