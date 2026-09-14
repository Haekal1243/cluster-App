import { IsString, IsNumber, IsPositive, Matches, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class GenerateIplDto {
  @IsString()
  @Matches(/^(0[1-9]|1[0-2])$/, { message: 'bulanPeriode harus format "01"-"12"' })
  bulanPeriode: string;

  @IsString()
  @Matches(/^\d{4}$/, { message: 'tahunPeriode harus format 4 digit, contoh "2026"' })
  tahunPeriode: string;

  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  nominal: number;
}
