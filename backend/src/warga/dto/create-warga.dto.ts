import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { RT, StatusRumah } from '@prisma/client';
import { BLOK_RUMAH_MESSAGE, BLOK_RUMAH_REGEX } from '../../common/helpers';

const blank = ({ value }: { value: unknown }) => (value === '' ? undefined : value);

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

  @IsOptional()
  @IsString()
  @MinLength(3)
  @Transform(blank)
  username?: string;

  @IsOptional()
  @IsString()
  @MinLength(6)
  @Transform(blank)
  password?: string;

  @IsOptional()
  @IsEnum(StatusRumah)
  @Transform(blank)
  statusRumah?: StatusRumah;

  @IsOptional()
  @IsBoolean()
  sebagaiPenyewa?: boolean;
}
