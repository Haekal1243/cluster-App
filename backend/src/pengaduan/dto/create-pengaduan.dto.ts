import { IsEnum, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { Area, KategoriPengaduan } from '@prisma/client';

export class CreatePengaduanDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(50, { message: 'Judul maksimal 50 karakter' })
  judul!: string;

  @IsEnum(KategoriPengaduan)
  @IsNotEmpty()
  kategori!: KategoriPengaduan;

  @IsEnum(Area)
  @IsNotEmpty()
  tujuan!: Area;

  @IsString()
  @IsNotEmpty()
  deskripsi!: string;
}
