import { IsNotEmpty, IsString, IsEnum, IsOptional, IsInt } from 'class-validator';
import { RT } from '@prisma/client';
import { Type } from 'class-transformer';

export class CreateRumahDto {
  @IsString()
  @IsNotEmpty()
  blokRumah!: string;

  @IsEnum(RT)
  @IsNotEmpty()
  rt!: RT;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  userId?: number;
}
