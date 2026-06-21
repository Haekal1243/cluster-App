import { PartialType } from '@nestjs/mapped-types';
import { CreateWargaDto } from './create-warga.dto';

export class UpdateWargaDto extends PartialType(CreateWargaDto) {}
