import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { Area, StatusPengumuman } from '@prisma/client';

const kosongJadiUndefined = ({ value }: { value: unknown }) => (value === '' ? undefined : value);

export class CreatePengumumanDto {
  @IsString()
  @IsNotEmpty()
  judul!: string;

  @IsString()
  @IsNotEmpty()
  keteranganPengumuman!: string;

  @IsEnum(StatusPengumuman)
  @IsOptional()
  status?: StatusPengumuman;

  @IsOptional()
  @Transform(kosongJadiUndefined)
  @IsEnum(Area)
  area?: Area;

  @IsOptional()
  @Transform(kosongJadiUndefined)
  @Type(() => Number)
  @IsInt()
  @Min(0)
  durasiHari?: number;
}
