import 'dotenv/config';
import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './shared/filters/global-exception.filter';
import { ResponseInterceptor } from './shared/interceptors/response.interceptor';
import { TrimStringsPipe } from './shared/pipes/trim-strings.pipe';

async function bootstrap() {
  const emailEnabled = process.env['EMAIL_ENABLED'] === 'true';
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

  const appDomain = process.env['APP_DOMAIN']!.replace(
    /^(?:https?:\/\/)?([^/?#]+).*/,
    '$1'
  ).replace(/\./g, '\\.');

  const secureDomainRegex = new RegExp(
    `^https://([a-zA-Z0-9-]+\\.)*${appDomain}(:[0-9]+)?$`
  );
  const domainRegex = new RegExp(
    `^https?://([a-zA-Z0-9-]+\\.)*${appDomain}(:[0-9]+)?$`
  );
  const localhostRegex = /^https?:\/\/localhost:[0-9]+$/;

  const isProd = process.env['NODE_ENV'] === 'production';
  const isStaging = process.env['NODE_ENV'] === 'staging';

  const allowedOrigin = isProd
    ? secureDomainRegex
    : isStaging
      ? [localhostRegex, domainRegex]
      : [localhostRegex];

  app.enableCors({
    origin: allowedOrigin,
    credentials: true,
  });

  const port = process.env['PORT'] ?? 3000;
  await app.listen(port);
}

bootstrap();
