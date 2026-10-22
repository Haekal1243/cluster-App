import { IsInt, IsOptional, IsPositive, Max } from 'class-validator';
import { Type } from 'class-transformer';

/** Field multipart (bukti ada di field `file`); angka datang sebagai string sehingga perlu @Type. */
export class BayarIplDto {
  @Type(() => Number)
  @IsInt({ message: 'idIpl harus berupa angka bulat' })
  @IsPositive({ message: 'idIpl tidak valid' })
  @Max(2_147_483_647, { message: 'idIpl tidak valid' })
  idIpl: number;

  /** Diterima demi kompatibilitas klien lama, tapi diabaikan: nominal selalu dihitung server dari tagihan. */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  @Max(1_000_000_000)
  nominal?: number;
}
