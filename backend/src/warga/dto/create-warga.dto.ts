// src/warga/dto/create-warga.dto.ts
import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateWargaDto {
  @IsNotEmpty()
  @IsString()
  nama!: string; 

  @IsNotEmpty()
  @IsEmail()
  email!: string;

  @IsNotEmpty()
  @IsString()
  @MinLength(6)
  password!: string; 

  @IsNotEmpty()
  @IsString()
  noHp!: string; 
}