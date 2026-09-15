import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { KategoriPengaduan } from '@prisma/client';

export class CreatePengaduanDto {
  @IsString()
  @IsNotEmpty()
  judul!: string;

  @IsEnum(KategoriPengaduan)
  @IsNotEmpty()
  kategori!: KategoriPengaduan;

  @IsString()
  @IsNotEmpty()
  deskripsi!: string;
}
