import { IsEnum, IsIn, IsOptional, IsString } from 'class-validator';
import { RT } from '@prisma/client';

export class CreateSetoranDto {
  @IsOptional()
  @IsEnum(RT)
  rt?: RT;
}

export class KonfirmasiSetoranDto {
  @IsIn(['TERIMA', 'TOLAK'])
  action: 'TERIMA' | 'TOLAK';

  @IsOptional()
  @IsString()
  catatan?: string;
}
