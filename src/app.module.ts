import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LobbyConfigModule } from './config/lobby-config.module';
import { DatabaseModule } from './database/database.module';
import { EntryModule } from './entry/entry.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    LobbyConfigModule,
    DatabaseModule,
    HealthModule,
    EntryModule,
  ],
})
export class AppModule {}
