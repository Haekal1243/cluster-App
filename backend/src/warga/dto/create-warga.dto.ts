import { IsEmail, IsNotEmpty, IsString, MinLength, IsOptional, IsEnum, Matches } from 'class-validator';
import {RT } from '@prisma/client';

const BLOK_RUMAH_REGEX = /^E\d{1,2}\/\d{1,2}$/;
const BLOK_RUMAH_MESSAGE = 'Format blok rumah harus seperti E7/15';

export class CreateWargaDto {
  @IsString()
  @IsNotEmpty()
  nama!: string;

  @IsString()
  @IsNotEmpty()
  no_hp!: string;

  @IsEnum(RT)
  @IsNotEmpty()
  rt!: RT;

  @IsString()
  @IsNotEmpty()
  @Matches(BLOK_RUMAH_REGEX, { message: BLOK_RUMAH_MESSAGE })
  blokRumah!: string;

  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @IsString()
  @MinLength(6)
  password!: string;

  @IsString()
  @IsOptional()
  role?: string; 
}