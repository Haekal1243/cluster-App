import { IsBoolean, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';
import { Transform } from 'class-transformer';
import { Area } from '@prisma/client';

export class CreateCatatanRapatDto {
  @IsString()
  @IsNotEmpty()
  judul!: string;

  @IsString()
  @IsOptional()
  isiNotulen?: string;

  @IsOptional()
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsEnum(Area)
  area?: Area;
}

export class UpdateCatatanRapatDto extends PartialType(CreateCatatanRapatDto) {
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  hapusFile?: boolean;
}
