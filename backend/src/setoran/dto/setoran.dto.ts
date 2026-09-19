import { IsEnum, IsIn, IsOptional, IsString } from 'class-validator';
import { RT } from '@prisma/client';

export class CreateSetoranDto {
  /** Hanya untuk user ber-scope ALL (mis. admin); bendahara RT otomatis RT-nya. */
  @IsOptional()
  @IsEnum(RT)
  rt?: RT;
}

export class KonfirmasiSetoranDto {
  @IsIn(['TERIMA', 'TOLAK'])
  action: 'TERIMA' | 'TOLAK';

  /** Wajib diisi bila TOLAK (alasan penolakan). */
  @IsOptional()
  @IsString()
  catatan?: string;
}
