import { IsEnum, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { KategoriPengaduan } from '@prisma/client';

export class CreatePengaduanDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(50, { message: 'Judul maksimal 50 karakter' })
  judul!: string;

  @IsEnum(KategoriPengaduan)
  @IsNotEmpty()
  kategori!: KategoriPengaduan;

  @IsString()
  @IsNotEmpty()
  deskripsi!: string;
}
