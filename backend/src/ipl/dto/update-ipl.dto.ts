import { IsInt, IsOptional, IsPositive, IsString, Max, MaxLength, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateIplDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive({ message: 'nominalIpl harus lebih dari 0' })
  @Max(100_000_000, { message: 'nominalIpl terlalu besar (maksimal Rp 100.000.000)' })
  nominalIpl?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0, { message: 'nominalKas tidak boleh negatif' })
  @Max(100_000_000, { message: 'nominalKas terlalu besar (maksimal Rp 100.000.000)' })
  nominalKas?: number;

  /**
   * Alasan koreksi — wajib diisi bila nominal berubah. Dicatat di jejak audit
   * dan diteruskan ke RW agar koreksi tidak bisa dilakukan diam-diam.
   */
  @IsOptional()
  @IsString()
  @MaxLength(500)
  alasan?: string;
}
