// backend/src/main.ts
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { PesanIndonesiaFilter, validasiIndonesia } from './common/pesan-indonesia';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // crossOriginResourcePolicy 'cross-origin' supaya file di /uploads (pengumuman, kegiatan,
  // pengaduan) tetap bisa di-load frontend yang jalan di origin/port berbeda (dev: LAN IP:3000
  // vs backend :4000).
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

  // Origin frontend yang diizinkan; override lewat env CORS_ORIGINS (dipisah koma) untuk
  // production atau saat IP LAN dev berubah. Default mencakup localhost & LAN dev umum.
  const corsOrigins = (
    process.env.CORS_ORIGINS ?? 'http://localhost:3000,http://192.168.200.34:3000'
  )
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  app.enableCors({ origin: corsOrigins });

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