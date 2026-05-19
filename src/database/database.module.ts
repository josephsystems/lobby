import { Global, Module } from '@nestjs/common';
import { DatabaseService } from './database.service';
import { MigrationStartupService } from './migration-startup.service';

// Global so any module can inject DatabaseService
// without importing DatabaseModule explicitly.
@Global()
@Module({
  providers: [DatabaseService, MigrationStartupService],
  exports: [DatabaseService],
})
export class DatabaseModule {}
