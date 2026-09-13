import { IsIn, IsOptional, IsString } from 'class-validator';

export class KonfirmasiIplDto {
  @IsIn(['TERIMA', 'TOLAK'])
  action: 'TERIMA' | 'TOLAK';

  @IsOptional()
  @IsString()
  catatan?: string;
}
