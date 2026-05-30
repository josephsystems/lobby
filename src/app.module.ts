import { DynamicModule, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { BullModule } from '@nestjs/bull';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { ThrottlerStorageRedisService } from '@nest-lab/throttler-storage-redis';
import Redis from 'ioredis';
import { LobbyConfigModule } from './shared/lobby-config/lobby-config.module';
import { DatabaseModule } from './database/database.module';
import { EntryModule } from './entry/entry.module';
import { HealthModule } from './health/health.module';
import { CommunicationModule } from './communication/communication.module';
import { EventModule } from './shared/events/event.module';
import { envValidationSchema } from './config/env.validation';
import { getRedisConfig } from './config/redis.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: envValidationSchema,
    }),
    LobbyConfigModule,
    DatabaseModule,
    HealthModule,
    EntryModule,
    EventModule,
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const redisConfig = getRedisConfig(configService);

        if (redisConfig.host && redisConfig.port) {
          return {
            throttlers: [{ ttl: 60000, limit: 10 }],
            storage: new ThrottlerStorageRedisService(new Redis(redisConfig)),
          };
        }

        return { throttlers: [{ ttl: 60000, limit: 10 }] };
      },
    }),
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {
  static register(emailEnabled: boolean): DynamicModule {
    const conditionalImports = emailEnabled
      ? [
          BullModule.forRootAsync({
            inject: [ConfigService],
            useFactory: async (configService: ConfigService) => {
              return {
                redis: {
                  host: configService.get<string>('REDIS_HOST'),
                  port: configService.get<number>('REDIS_PORT'),
                  password: configService.get<string>('REDIS_PASSWORD'),
                  user: configService.get<string>('REDIS_USER'),
                },
              };
            },
          }),
          CommunicationModule,
        ]
      : [];
    return {
      module: AppModule,
      imports: [...conditionalImports],
    };
  }
}
