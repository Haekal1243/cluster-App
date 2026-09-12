import { IsDateString, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { StatusKegiatan } from '@prisma/client';

export class CreateKegiatanDto {
  @IsString()
  @IsNotEmpty()
  judul!: string;

  @IsString()
  @IsNotEmpty()
  deskripsi!: string;

  @IsDateString()
  @IsNotEmpty()
  tanggalAcara!: string;

  @IsEnum(StatusKegiatan)
  @IsOptional()
  status?: StatusKegiatan;

  @IsString()
  @IsOptional()
  createBy?: string;
}
