import { PartialType } from '@nestjs/mapped-types';
import { IsOptional, IsString } from 'class-validator';
import { CreateKegiatanDto } from './create-kegiatan.dto';

export class UpdateKegiatanDto extends PartialType(CreateKegiatanDto) {
  @IsString()
  @IsOptional()
  updateBy?: string;
}
