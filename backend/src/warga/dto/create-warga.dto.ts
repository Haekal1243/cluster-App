import { IsEmail, IsNotEmpty, IsString, MinLength, IsOptional, IsEnum } from 'class-validator';
import {RT } from '@prisma/client';

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