import { DynamicModule, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { BullModule } from '@nestjs/bull';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { ThrottlerStorageRedisService } from '@nest-lab/throttler-storage-redis';
import Redis from 'ioredis';
import { LobbyConfigModule } from './shared/lobby-config/lobby-config.module';
import { DatabaseModule } from './database/database.module';
import { WaitlistModule } from './waitlist/waitlist.module';
import { HealthModule } from './health/health.module';
import { CommunicationModule } from './communication/communication.module';
import { EventModule } from './shared/events/event.module';
import { envValidationSchema } from './config/env.validation';
import { getRedisConfig } from './config/redis.config';
import { LobbyConfig } from './shared/types/config.types';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: envValidationSchema,
    }),
    DatabaseModule,
    HealthModule,
    WaitlistModule,
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
  static register(
    emailEnabled: boolean,
    lobbyConfig: LobbyConfig
  ): DynamicModule {
    const conditionalImports = emailEnabled
      ? [
          BullModule.forRootAsync({
            inject: [ConfigService],
            useFactory: async (configService: ConfigService) => {
              const redisConfig = getRedisConfig(configService);
              return {
                redis: redisConfig,
              };
            },
          }),
          CommunicationModule,
        ]
      : [];
    return {
      module: AppModule,
      imports: [...conditionalImports, LobbyConfigModule.forRoot(lobbyConfig)],
    };
  }
}
