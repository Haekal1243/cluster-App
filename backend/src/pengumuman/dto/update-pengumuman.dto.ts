import { PartialType } from '@nestjs/mapped-types';
import { IsOptional, IsString } from 'class-validator';
import { CreatePengumumanDto } from './create-pengumuman.dto';

export class UpdatePengumumanDto extends PartialType(CreatePengumumanDto) {
  @IsString()
  @IsOptional()
  updateBy?: string;
}
