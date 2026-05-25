import 'dotenv/config';
import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './shared/filters/global-exception.filter';
import { ResponseInterceptor } from './shared/interceptors/response.interceptor';
import { TrimStringsPipe } from './shared/pipes/trim-strings.pipe';

async function bootstrap() {
  const emailEnabled = process.env['EMAIL_ENABLED'] === 'true';
  const app = await NestFactory.create(AppModule.register(emailEnabled));

  app.useGlobalPipes(
    new TrimStringsPipe(),
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    })
  );

  app.useGlobalFilters(new GlobalExceptionFilter());
  app.useGlobalInterceptors(new ResponseInterceptor());

  app.setGlobalPrefix('api/v1');

  const port = process.env['PORT'] ?? 3000;
  await app.listen(port);
}

bootstrap();
