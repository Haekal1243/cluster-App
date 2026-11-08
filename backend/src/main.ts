import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import type { NextFunction, Request, Response } from 'express';
import { AppModule } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';
import { PesanIndonesiaFilter, validasiIndonesia } from './common/pesan-indonesia';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  const logger = new Logger('CORS');
  const isProd = process.env.NODE_ENV === 'production';
  const originEksplisit = (process.env.CORS_ORIGINS || '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  const defaultDev = isProd
    ? []
    : [
        'http://localhost:3000',
        'http://127.0.0.1:3000',
        'http://localhost:3001',
        'http://127.0.0.1:3001',
        'http://localhost:5173',
        'http://127.0.0.1:5173',
      ];
  const originDiizinkan = new Set([...defaultDev, ...originEksplisit]);
  const izinkanVercel = process.env.CORS_ALLOW_VERCEL_PREVIEW === 'true';
  const polaVercel = /^https:\/\/[a-z0-9-]+\.vercel\.app$/;

  app.set('trust proxy', Number(process.env.TRUST_PROXY ?? (isProd ? 1 : 0)));
  app.disable('x-powered-by');
  app.use((_req: Request, res: Response, next: NextFunction) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    if (isProd) res.setHeader('Strict-Transport-Security', 'max-age=15552000; includeSubDomains');
    next();
  });

  app.enableCors({
    origin(origin, callback) {
      if (!origin || originDiizinkan.has(origin) || (izinkanVercel && polaVercel.test(origin))) {
        callback(null, true);
      } else {
        logger.warn(`Origin ${origin} ditolak oleh CORS`);
        callback(null, false);
      }
    },
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: ['Content-Disposition'],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      exceptionFactory: validasiIndonesia,
    }),
  );
  app.useGlobalFilters(new PesanIndonesiaFilter());


  await app.listen(process.env.PORT ?? 4000, '0.0.0.0');
}
bootstrap();