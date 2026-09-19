// backend/src/main.ts
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { PesanIndonesiaFilter, validasiIndonesia } from './common/pesan-indonesia';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // <-- 2. Tambahkan pengaturan CORS
  app.enableCors();

  // <-- 3. Tambahkan ValidationPipe untuk class-validator
  // transform:true agar @Type() pada DTO berjalan (mis. nominal string
  // dari multipart FormData dikonversi ke number sebelum divalidasi)
  // exceptionFactory + filter: pesan error bawaan library ikut berbahasa Indonesia.
  app.useGlobalPipes(new ValidationPipe({ transform: true, exceptionFactory: validasiIndonesia }));
  app.useGlobalFilters(new PesanIndonesiaFilter());

  // Notulen bersifat rahasia per wilayah: tidak disajikan statis, hanya lewat
  // GET /catatan-rapat/:id/file yang mengecek login dan scope.
  app.use('/uploads/catatan-rapat', (_req: unknown, res: { status: (c: number) => { end: () => void } }) =>
    res.status(404).end(),
  );

  // Sajikan file yang diupload (mis. file pengumuman) secara statis
  app.useStaticAssets(join(process.cwd(), 'uploads'), { prefix: '/uploads/' });

await app.listen(process.env.PORT ?? 4000, '0.0.0.0');
}
bootstrap();