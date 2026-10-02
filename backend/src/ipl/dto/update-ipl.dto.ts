import { IsInt, IsOptional, IsPositive, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateIplDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive({ message: 'nominalIpl harus lebih dari 0' })
  nominalIpl?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0, { message: 'nominalKas tidak boleh negatif' })
  nominalKas?: number;

  /**
   * Alasan koreksi — wajib diisi bila nominal berubah. Dicatat di jejak audit
   * dan diteruskan ke RW agar koreksi tidak bisa dilakukan diam-diam.
   */
  @IsOptional()
  @IsString()
  alasan?: string;
}
