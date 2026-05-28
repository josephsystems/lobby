import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import { Kysely, PostgresDialect } from 'kysely';
import { Pool } from 'pg';
import type { LobbyDatabase } from '../shared/types/database.types';

/**
 * Manages the Kysely database instance and the underlying pg Pool.
 *
 * Exposes both the typed Kysely instance for queries and the raw Pool for
 * use cases that require a direct pg client (e.g. running migration SQL files).
 */
@Injectable()
export class DatabaseService implements OnModuleDestroy {
  readonly db: Kysely<LobbyDatabase>;
  readonly pool: Pool;

  constructor(config: ConfigService) {
    this.pool = new Pool({
      connectionString: config.getOrThrow<string>('DATABASE_URL'),
      max: 10,
      min: 2,
      idleTimeoutMillis: 30000,
      ...(config.get<boolean>('DATABASE_SSL') && {
        ssl: {
          rejectUnauthorized: true,
          ca: fs.readFileSync(
            config.getOrThrow<string>('DATABASE_CA_CERT_PATH')
          ),
        },
      }),
    });

    this.db = new Kysely<LobbyDatabase>({
      dialect: new PostgresDialect({ pool: this.pool }),
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.db.destroy();
  }
}
