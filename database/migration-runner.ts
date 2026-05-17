/* eslint-disable no-console */
import { Kysely, PostgresDialect, sql, Generated } from 'kysely';
import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

// ── Internal types ────────────────────────────────────────────────────────────

interface LobbyMigrationTable {
  id: Generated<number>;
  filename: string;
  applied_at: Generated<Date>;
}

interface MigrationDb {
  _lobby_migrations: LobbyMigrationTable;
}

interface ApplyOneOptions {
  pool: Pool;
  db: Kysely<MigrationDb>;
  filename: string;
  migrationsDir: string;
  log: Logger;
}

// ── Public API ────────────────────────────────────────────────────────────────

export interface MigrationResult {
  applied: string[];
  skipped: number;
}

export interface Logger {
  info: (msg: string) => void;
  warn: (msg: string) => void;
  success: (msg: string) => void;
  error: (msg: string) => void;
}

// ── Default logger ────────────────────────────────────────────────────────────────

const defaultLogger: Logger = {
  info: console.log,
  warn: console.warn,
  success: console.log,
  error: console.error,
};

/**
 * Applies all pending .sql files from the migrations/ directory.
 *
 * - Uses Kysely to read/write the _lobby_migrations tracking table
 * - Uses a raw pg client (from the same pool) to execute each SQL file
 *   inside a transaction, since migration files contain arbitrary DDL
 */
export async function runMigrations(
  databaseUrl: string,
  log: Logger = defaultLogger
): Promise<MigrationResult> {
  const pool = new Pool({ connectionString: databaseUrl });

  const db = new Kysely<MigrationDb>({
    dialect: new PostgresDialect({ pool }),
  });

  try {
    await ensureTrackingTable(db);

    const migrationsDir = path.join(process.cwd(), 'migrations');

    if (!fs.existsSync(migrationsDir)) {
      log.warn('No migrations/ directory found. Run "pnpm run setup" first.');
      return { applied: [], skipped: 0 };
    }

    const files = fs
      .readdirSync(migrationsDir)
      .filter((f) => f.endsWith('.sql'))
      .sort(); // YYYYMMDDHHMMSS_ prefix keeps them in correct order

    if (files.length === 0) {
      log.info('No migration files found.');
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
      await applyOne({ pool, db, filename, migrationsDir, log });
      justApplied.push(filename);
    }

    return { applied: justApplied, skipped: files.length - pending.length };
  } finally {
    // destroy() closes the underlying pool as well
    await db.destroy();
  }
}

// ── Internals ─────────────────────────────────────────────────────────────────

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
  db,
  filename,
  migrationsDir,
  log,
}: ApplyOneOptions): Promise<void> {
  const filePath = path.join(migrationsDir, filename);
  const sqlContent = fs.readFileSync(filePath, 'utf-8').trim();

  let client;
  try {
    client = await pool.connect();
    await client.query('BEGIN');
    await client.query(sqlContent);
    await client.query('COMMIT');

    await db.insertInto('_lobby_migrations').values({ filename }).execute();

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
