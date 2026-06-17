/* eslint-disable no-console */
import { Kysely, PostgresDialect, sql } from 'kysely';
import { Pool, PoolClient } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import type { LobbyMigrationTable } from '../../shared/types/database.types';
import { PROJECT_ROOT } from '../../shared/utils/paths.util';

// ── Internal types ──────────────────────────────────────

interface MigrationDb {
  _lobby_migrations: LobbyMigrationTable;
}

interface ApplyOneOptions {
  pool: Pool;
  filename: string;
  migrationsDir: string;
  log: Logger;
}

// ── Public API ──────────────────────────────────────────

export interface MigrationRunResult {
  applied: string[];
  skipped: number;
}

export interface Logger {
  info: (msg: string) => void;
  warn: (msg: string) => void;
  success: (msg: string) => void;
  error: (msg: string) => void;
}

// ── Default logger ──────────────────────────────────────

const defaultLogger: Logger = {
  info: console.log,
  warn: console.warn,
  success: console.log,
  error: console.error,
};

/**
 * Applies all pending .sql files from the migrations/ directory.
 *
 * - Accepts an existing Pool — the caller owns its lifecycle
 * - Creates a lightweight Kysely wrapper for tracking table queries
 * - Uses a raw pg client for executing each SQL file inside a transaction,
 *   since migration files contain arbitrary DDL
 */
export async function runMigrations(
  pool: Pool,
  log: Logger = defaultLogger
): Promise<MigrationRunResult> {
  const db = new Kysely<MigrationDb>({
    dialect: new PostgresDialect({ pool }),
  });

  await ensureTrackingTable(db);

  const migrationsDir = path.join(PROJECT_ROOT, 'migrations');

  if (!fs.existsSync(migrationsDir)) {
    log.warn('No migrations/ directory found. Have you ran "pnpm run setup"?');
    return { applied: [], skipped: 0 };
  }

  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort(); // YYYYMMDDHHMMSS_ prefix keeps them in correct order

  if (files.length === 0) {
    log.info('No migration files found. Have you ran "pnpm run setup"?');
    return { applied: [], skipped: 0 };
  }

  const applied = await db
    .selectFrom('_lobby_migrations')
    .select('filename')
    .execute();

  const appliedSet = new Set(applied.map((m) => m.filename));
  const pending = files.filter((f) => !appliedSet.has(f));

  if (pending.length === 0) {
    log.info(`All ${files.length} migration(s) already applied.`);
    return { applied: [], skipped: files.length };
  }

  log.info(`Applying ${pending.length} pending migration(s)...`);

  const justApplied: string[] = [];

  for (const filename of pending) {
    await applyOne({ pool, filename, migrationsDir, log });
    justApplied.push(filename);
  }

  return { applied: justApplied, skipped: files.length - pending.length };
}

// ── Internals ───────────────────────────────────────────

async function ensureTrackingTable(db: Kysely<MigrationDb>): Promise<void> {
  await sql`
    CREATE TABLE IF NOT EXISTS _lobby_migrations (
      id         SERIAL      PRIMARY KEY,
      filename   TEXT        NOT NULL UNIQUE,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `.execute(db);
}

async function applyOne({
  pool,
  filename,
  migrationsDir,
  log,
}: ApplyOneOptions): Promise<void> {
  const filePath = path.join(migrationsDir, filename);
  const sqlContent = fs.readFileSync(filePath, 'utf-8').trim();

  let client: PoolClient | undefined;
  try {
    client = await pool.connect();
    await client.query('BEGIN');
    await client.query(sqlContent);
    await client.query('INSERT INTO _lobby_migrations (filename) VALUES ($1)', [
      filename,
    ]);
    await client.query('COMMIT');

    log.success(`  ✓ ${filename}`);
  } catch (err) {
    if (client) await client.query('ROLLBACK');
    const message = err instanceof Error ? err.message : String(err);
    // Hard throw — never run with a partially applied schema
    throw new Error(`Migration failed [${filename}]: ${message}`, {
      cause: err,
    });
  } finally {
    if (client) client.release();
  }
}
