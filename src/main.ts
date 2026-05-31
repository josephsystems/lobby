import 'dotenv/config';
import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './shared/filters/global-exception.filter';
import { ResponseInterceptor } from './shared/interceptors/response.interceptor';
import { TrimStringsPipe } from './shared/pipes/trim-strings.pipe';
import { buildCorsOrigin } from './config/cors.config';
import { Environment } from './shared/constants/environment.constants';
import { validateConfig } from './config/bootstrap.config';

async function bootstrap() {
  const { emailEnabled } = validateConfig();
  const app = await NestFactory.create(AppModule.register(emailEnabled));

  app.use(helmet());

  app.useGlobalPipes(
    new TrimStringsPipe(),
    new ValidationPipe({
      whitelist: true,
      transform: true,
    })
  );

  app.useGlobalFilters(new GlobalExceptionFilter());
  app.useGlobalInterceptors(new ResponseInterceptor());

  app.setGlobalPrefix('api/v1');

  const nodeEnv = process.env['NODE_ENV'] ?? Environment.DEVELOPMENT;
  const appDomain = process.env['APP_DOMAIN']!;

  app.enableCors({
    origin: buildCorsOrigin(appDomain, nodeEnv),
    credentials: true,
  });

  const port = process.env['PORT'] ?? 3000;
  await app.listen(port);
}

bootstrap();
