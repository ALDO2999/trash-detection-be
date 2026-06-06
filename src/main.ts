import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/http-exception.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Security headers (matikan CORP agar gambar bisa diakses lintas origin)
  app.use(helmet({ crossOriginResourcePolicy: false }));

  // Layani file upload statis di /uploads (foto profil, hasil scan, dll)
  app.useStaticAssets(join(process.cwd(), 'uploads'), { prefix: '/uploads/' });

  // CORS
  app.enableCors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // Global prefix
  app.setGlobalPrefix('api');

  // Global validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Global exception filter
  app.useGlobalFilters(new GlobalExceptionFilter());

  // Global response interceptor
  app.useGlobalInterceptors(new ResponseInterceptor());

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`Application running on http://localhost:${port}/api`);
}
bootstrap();
