import { IsString, IsInt, IsPositive, IsOptional, IsEnum, Matches, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { RT } from '@prisma/client';

export class GenerateIplDto {
  @IsString()
  @Matches(/^(0[1-9]|1[0-2])$/, { message: 'bulanPeriode harus format "01"-"12"' })
  bulanPeriode: string;

  @IsString()
  @Matches(/^\d{4}$/, { message: 'tahunPeriode harus format 4 digit, contoh "2026"' })
  tahunPeriode: string;

  /** Porsi IPL yang nanti disetor RT ke RW. */
  @Type(() => Number)
  @IsInt()
  @IsPositive({ message: 'nominalIpl harus lebih dari 0' })
  @Max(100_000_000, { message: 'nominalIpl terlalu besar (maksimal Rp 100.000.000)' })
  nominalIpl: number;

  /** Potongan kas RT; tidak ikut disetor ke RW. */
  @Type(() => Number)
  @IsInt()
  @Min(0, { message: 'nominalKas tidak boleh negatif' })
  @Max(100_000_000, { message: 'nominalKas terlalu besar (maksimal Rp 100.000.000)' })
  nominalKas: number;

  /** Hanya dipakai user ber-scope ALL (mis. admin); pengurus RT otomatis RT-nya sendiri. */
  @IsOptional()
  @IsEnum(RT)
  rt?: RT;
}
