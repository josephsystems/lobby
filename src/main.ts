import 'dotenv/config';
import 'reflect-metadata';
import { RequestMethod, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './shared/filters/global-exception.filter';
import { ResponseInterceptor } from './shared/interceptors/response.interceptor';
import { TrimStringsPipe } from './shared/pipes/trim-strings.pipe';
import { buildCorsOrigin } from './config/cors.config';
import { Environment } from './shared/constants/environment.constants';
import { loadAndValidateConfig } from './config/bootstrap.config';

async function bootstrap() {
  const { emailEnabled, lobbyConfig } = loadAndValidateConfig();
  const app = await NestFactory.create(
    AppModule.register(emailEnabled, lobbyConfig)
  );

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

  app.setGlobalPrefix('api/v1', {
    exclude: [
      { path: '/', method: RequestMethod.GET },
      { path: '/api', method: RequestMethod.GET },
      { path: '/api/v1', method: RequestMethod.GET },
    ],
  });

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
