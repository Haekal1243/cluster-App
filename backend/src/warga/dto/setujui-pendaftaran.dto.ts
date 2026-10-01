import { IsEnum, IsOptional } from 'class-validator';
import { StatusRumah } from '@prisma/client';

/**
 * Status hunian awal saat pendaftaran disetujui. Rumah kosong yang pemiliknya
 * mendaftar untuk rumahnya sendiri tetap KOSONG (tidak dihuni, tapi ditagih IPL
 * dan masuk kas RT). Pilih DIHUNI_* bila pendaftar langsung menempati rumah.
 */
export class SetujuiPendaftaranDto {
  @IsOptional()
  @IsEnum(StatusRumah)
  status?: StatusRumah;
}
