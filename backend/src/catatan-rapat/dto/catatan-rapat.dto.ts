import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';
import { Transform } from 'class-transformer';
import { Area } from '@prisma/client';

export class CreateCatatanRapatDto {
  @IsString()
  @IsNotEmpty()
  judul!: string;

  @IsString()
  @IsNotEmpty()
  isiNotulen!: string;

  /**
   * Tidak ada pilihan kategori: area ditentukan otomatis dari jabatan pembuat
   * (sekre RW -> RW, sekre RT2 -> RT_02). Hanya admin (scope ALL) yang boleh menentukan.
   */
  @IsOptional()
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsEnum(Area)
  area?: Area;
}

export class UpdateCatatanRapatDto extends PartialType(CreateCatatanRapatDto) {}
