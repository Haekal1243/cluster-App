import { IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class KeputusanPengajuanDto {
  @IsIn(['SETUJU', 'TOLAK'])
  action: 'SETUJU' | 'TOLAK';

  @IsOptional()
  @IsString()
  alasan?: string;

  @IsOptional()
  @Transform(({ value }) => (value === '' ? undefined : value))
  @Type(() => Number)
  @IsInt()
  @Min(0)
  durasiHari?: number;
}
