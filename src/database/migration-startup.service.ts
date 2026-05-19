import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { DatabaseService } from './database.service';
import { runMigrations } from './lib/migration-runner';

@Injectable()
export class MigrationStartupService implements OnApplicationBootstrap {
  private readonly logger = new Logger(MigrationStartupService.name);

  constructor(private readonly databaseService: DatabaseService) {}

  async onApplicationBootstrap(): Promise<void> {
    await runMigrations(this.databaseService.pool, {
      info: (msg) => this.logger.log(msg),
      warn: (msg) => this.logger.warn(msg),
      success: (msg) => this.logger.log(msg),
      error: (msg) => this.logger.error(msg),
    });
  }
}
