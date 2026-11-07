import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class AjukanHapusDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  alasan!: string;
}
