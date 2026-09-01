// backend/src/main.ts
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common'; // <-- 1. Tambahkan import ini

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // <-- 2. Tambahkan pengaturan CORS
  app.enableCors();

  // <-- 3. Tambahkan ValidationPipe untuk class-validator
  app.useGlobalPipes(new ValidationPipe());

  // Sajikan file yang diupload (mis. file pengumuman) secara statis
  app.useStaticAssets(join(process.cwd(), 'uploads'), { prefix: '/uploads/' });

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();