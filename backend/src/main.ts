// backend/src/main.ts
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { PesanIndonesiaFilter, validasiIndonesia } from './common/pesan-indonesia';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // <-- 2. Tambahkan pengaturan CORS
  // Sebelumnya menerima SEMUA origin (tidak ada whitelist sama sekali). Sekarang dibatasi:
  // - origin eksplisit dari env CORS_ORIGINS (dev lokal, custom domain, dst)
  // - *.vercel.app (preview deployment Vercel dapat URL unik tiap deploy, jadi dipakai pola,
  //   bukan daftar statis — tetap aman karena subdomain itu hanya bisa dibuat dari project Vercel kita)
  // - request tanpa header Origin (server-to-server/curl, bukan browser) tetap diizinkan
  // exposedHeaders: agar fetch browser boleh MEMBACA Content-Disposition
  // (dipakai tombol Export agar nama file dari server ikut terpakai).
  const originEksplisit = (process.env.CORS_ORIGINS || '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  const polaVercel = /^https:\/\/[a-z0-9-]+\.vercel\.app$/;

  app.enableCors({
    origin(origin, callback) {
      if (!origin || originEksplisit.includes(origin) || polaVercel.test(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`Origin ${origin} tidak diizinkan oleh CORS`));
      }
    },
    exposedHeaders: ['Content-Disposition'],
  });

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

  // Semua file upload disimpan di database (tb_File). File publik diambil lewat GET /files/:id;
  // bukti finansial & notulen hanya lewat endpoint modulnya (cek login + wilayah).

  await app.listen(process.env.PORT ?? 4000, '0.0.0.0');
}
bootstrap();