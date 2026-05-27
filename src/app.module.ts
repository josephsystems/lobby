import { DynamicModule, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bull';
import { LobbyConfigModule } from './shared/lobby-config/lobby-config.module';
import { DatabaseModule } from './database/database.module';
import { EntryModule } from './entry/entry.module';
import { HealthModule } from './health/health.module';
import { envValidationSchema } from './config/env.validation';
import { CommunicationModule } from './communication/communication.module';
import { EventModule } from './shared/events/event.module';

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
  ],
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
