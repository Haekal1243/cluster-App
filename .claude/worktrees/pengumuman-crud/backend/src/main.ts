// backend/src/main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common'; // <-- 1. Tambahkan import ini

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // <-- 2. Tambahkan pengaturan CORS
  app.enableCors(); 

  // <-- 3. Tambahkan ValidationPipe untuk class-validator
  app.useGlobalPipes(new ValidationPipe()); 

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();