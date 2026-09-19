import { PartialType } from '@nestjs/mapped-types';
import { CreatePengumumanDto } from './create-pengumuman.dto';

export class UpdatePengumumanDto extends PartialType(CreatePengumumanDto) {}
