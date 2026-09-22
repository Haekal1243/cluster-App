import { IsNotEmpty, IsString } from 'class-validator';

export class TolakPendaftaranDto {
  @IsString()
  @IsNotEmpty()
  alasan!: string;
}
