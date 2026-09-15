import { IsOptional, IsString, IsEnum, IsInt, Matches } from 'class-validator';
import { RT } from '@prisma/client';
import { Type } from 'class-transformer';

const BLOK_RUMAH_REGEX = /^E\d{1,2}\/\d{1,2}$/;
const BLOK_RUMAH_MESSAGE = 'Format blok rumah harus seperti E7/15';

export class UpdateRumahDto {
  @IsOptional()
  @IsString()
  @Matches(BLOK_RUMAH_REGEX, { message: BLOK_RUMAH_MESSAGE })
  blokRumah?: string;

  @IsOptional()
  @IsEnum(RT)
  rt?: RT;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  userId?: number | null;
}
