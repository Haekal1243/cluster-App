import { IsInt, IsOptional, IsPositive, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class BayarIplDto {
  @Type(() => Number)
  @IsInt({ message: 'idIpl harus berupa angka bulat' })
  @IsPositive({ message: 'idIpl tidak valid' })
  @Max(2_147_483_647, { message: 'idIpl tidak valid' })
  idIpl: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  @Max(1_000_000_000)
  nominal?: number;
}
