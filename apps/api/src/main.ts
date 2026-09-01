import 'reflect-metadata';
import { join } from 'path';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ZodValidationPipe, patchNestJsSwagger } from 'nestjs-zod';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

// Makes @nestjs/swagger understand createZodDto() classes so /api/docs
// renders real schemas for zod-validated request/response bodies.
patchNestJsSwagger();

async function bootstrap() {
  // `rawBody: true` exposes `req.rawBody` on every request (Nest's built-in
  // mechanism for this — no manual body-parser reconfiguration needed) —
  // the Stripe webhook handler needs the exact raw bytes to verify the
  // request's signature; the already-JSON-parsed body isn't enough.
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { rawBody: true });

  const corsOrigins = (process.env.CORS_ORIGINS ?? 'http://localhost:5173,http://localhost:5174')
    .split(',')
    .map((origin) => origin.trim());

  app.enableCors({
    origin: corsOrigins,
    credentials: true,
  });

  // Uploaded product images are served from here, deliberately outside the
  // /api prefix set below — they're static files, not API resources.
  app.useStaticAssets(join(__dirname, '..', 'uploads'), { prefix: '/uploads/' });

  app.use(cookieParser());
  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ZodValidationPipe());
  app.useGlobalFilters(new HttpExceptionFilter());

  const config = new DocumentBuilder()
    .setTitle('Plasti Matic API')
    .setDescription('Internal dashboard + e-commerce API for EURL Plasti Matic')
    .setVersion('0.1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT ? Number(process.env.PORT) : 3001;
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`API running on http://localhost:${port}/api — docs at /api/docs`);
}

bootstrap();
