import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { RT } from '@prisma/client';

const blank = ({ value }: { value: unknown }) => (value === '' ? undefined : value);

export class DaftarMandiriDto {
  @IsString()
  @IsNotEmpty()
  namaUser!: string;

  @IsString()
  @IsNotEmpty()
  noTelp!: string;

  @IsString()
  @MinLength(6, { message: 'Kata sandi minimal 6 karakter' })
  password!: string;

  @IsEnum(RT)
  @IsNotEmpty()
  rt!: RT;

  @IsInt()
  rumahId!: number;
}
