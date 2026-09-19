import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { Area, TipeKas } from '@prisma/client';

export class CreateKasDto {
  @IsEnum(TipeKas, { message: 'tipe harus PEMASUKAN atau PENGELUARAN' })
  tipe: TipeKas;

  @IsString()
  @MaxLength(60)
  kategori: string;

  @Type(() => Number)
  @IsInt()
  @IsPositive({ message: 'nominal harus lebih dari 0' })
  nominal: number;

  @IsDateString({}, { message: 'tanggal harus format ISO, contoh 2026-09-15' })
  tanggal: string;

  @IsOptional()
  @IsString()
  keterangan?: string;

  /** Hanya untuk user ber-scope ALL (mis. admin). Selain itu area otomatis dari jabatan. */
  @IsOptional()
  @IsEnum(Area)
  area?: Area;
}
