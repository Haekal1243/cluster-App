import { IsOptional, IsString, IsEnum, IsInt } from 'class-validator';
import { RT } from '@prisma/client';
import { Type } from 'class-transformer';

export class UpdateRumahDto {
  @IsOptional()
  @IsString()
  blokRumah?: string;

  @IsOptional()
  @IsEnum(RT)
  rt?: RT;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  userId?: number | null;
}
