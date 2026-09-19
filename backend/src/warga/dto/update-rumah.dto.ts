import { IsOptional, IsString, IsEnum, IsInt, Matches } from 'class-validator';
import { RT, StatusRumah } from '@prisma/client';
import { Type } from 'class-transformer';
import { BLOK_RUMAH_MESSAGE, BLOK_RUMAH_REGEX } from '../../common/helpers';

export class UpdateRumahDto {
  @IsOptional()
  @IsString()
  @Matches(BLOK_RUMAH_REGEX, { message: BLOK_RUMAH_MESSAGE })
  blokRumah?: string;

  @IsOptional()
  @IsEnum(RT)
  rt?: RT;

  @IsOptional()
  @IsEnum(StatusRumah)
  status?: StatusRumah;

  /** null = kosongkan rumah. */
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  userId?: number | null;
}
