import { PartialType } from '@nestjs/mapped-types';
import { CreateWargaDto } from './create-warga.dto';

/** rt/blokRumah/statusRumah diatur lewat menu rumah, bukan lewat update warga. */
export class UpdateWargaDto extends PartialType(CreateWargaDto) {}
