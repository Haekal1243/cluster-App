import { PartialType } from '@nestjs/mapped-types';
import { CreateKegiatanDto } from './create-kegiatan.dto';

export class UpdateKegiatanDto extends PartialType(CreateKegiatanDto) {}
