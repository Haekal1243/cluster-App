import { IsEnum, IsInt, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class MulaiKontrakDto {
  @IsInt()
  @Type(() => Number)
  penyewaId!: number;
}

export class AkhiriKontrakDto {
  @IsOptional()
  @IsEnum({ KOSONG: 'KOSONG', DIHUNI_TETAP: 'DIHUNI_TETAP' })
  statusSetelah?: 'KOSONG' | 'DIHUNI_TETAP';
}
