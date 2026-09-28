// backend/src/main.ts
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'node:path';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { PesanIndonesiaFilter, validasiIndonesia } from './common/pesan-indonesia';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // <-- 2. Tambahkan pengaturan CORS
  // exposedHeaders: agar fetch browser boleh MEMBACA Content-Disposition
  // (dipakai tombol Export agar nama file dari server ikut terpakai).
  app.enableCors({ exposedHeaders: ['Content-Disposition'] });

  // <-- 3. Tambahkan ValidationPipe untuk class-validator
  // transform:true agar @Type() pada DTO berjalan (mis. nominal string
  // dari multipart FormData dikonversi ke number sebelum divalidasi)
  // exceptionFactory + filter: pesan error bawaan library ikut berbahasa Indonesia.
  // whitelist: buang field yang tidak ada di DTO; forbidNonWhitelisted: tolak requestnya
  // (bukan cuma dibuang diam-diam) kalau ada field ekstra yang tidak dikenal — mencegah
  // mass assignment (mis. klien iseng kirim `roleId`/`isVerified` di body).
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      exceptionFactory: validasiIndonesia,
    }),
  );
  app.useGlobalFilters(new PesanIndonesiaFilter());

  // Bukti finansial (bukti transfer IPL, setoran, transaksi kas) & notulen rapat
  // bersifat rahasia: tidak disajikan statis, hanya lewat endpoint terautentikasi
  // yang mengecek login + scope wilayah (GET .../:id/bukti atau .../:id/file).
  const blokirStatis = (_req: unknown, res: { status: (c: number) => { end: () => void } }) =>
    res.status(404).end();
  app.use('/uploads/catatan-rapat', blokirStatis);
  app.use('/uploads/bukti-bayar', blokirStatis);
  app.use('/uploads/setoran', blokirStatis);
  app.use('/uploads/keuangan', blokirStatis);

  // Sajikan file yang diupload (mis. file pengumuman) secara statis
  app.useStaticAssets(join(process.cwd(), 'uploads'), { prefix: '/uploads/' });

await app.listen(process.env.PORT ?? 4000, '0.0.0.0');
}
bootstrap();