import { IsString, IsDateString, IsInt, IsPositive, IsOptional, IsEnum, Matches, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { RT } from '@prisma/client';

export class GenerateIplDto {
  @IsString()
  @Matches(/^(0[1-9]|1[0-2])$/, { message: 'bulanPeriode harus format "01"-"12"' })
  bulanPeriode: string;

  @IsString()
  @Matches(/^\d{4}$/, { message: 'tahunPeriode harus format 4 digit, contoh "2026"' })
  tahunPeriode: string;

  @IsDateString({ strict: true }, { message: 'jatuhTempo harus tanggal format YYYY-MM-DD' })
  jatuhTempo: string;

  @Type(() => Number)
  @IsInt()
  @IsPositive({ message: 'nominalIpl harus lebih dari 0' })
  @Max(100_000_000, { message: 'nominalIpl terlalu besar (maksimal Rp 100.000.000)' })
  nominalIpl: number;

  @Type(() => Number)
  @IsInt()
  @Min(0, { message: 'nominalKas tidak boleh negatif' })
  @Max(100_000_000, { message: 'nominalKas terlalu besar (maksimal Rp 100.000.000)' })
  nominalKas: number;

  @IsOptional()
  @IsEnum(RT)
  rt?: RT;
}
