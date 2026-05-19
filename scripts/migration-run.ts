/* eslint-disable no-console */
import 'dotenv/config';
import { Pool } from 'pg';
import { runMigrations } from '../src/database/lib/migration-runner';

// ── Guards ──────────────────────────────────────────────

const databaseUrl = process.env['DATABASE_URL'];

if (!databaseUrl) {
  console.error('Error: DATABASE_URL is not set. Add it to your .env file.');
  process.exit(1);
}

// ── Apply pending migrations ────────────────────────────

const pool = new Pool({ connectionString: databaseUrl });

runMigrations(pool)
  .then(async ({ applied, skipped }) => {
    if (applied.length > 0) {
      console.log(
        `Applied ${applied.length} migration(s). ${skipped} already up to date.`
      );
    }
    await pool.end();
    process.exit(0);
  })
  .catch(async (err: unknown) => {
    console.error(err instanceof Error ? err.message : err);
    await pool.end();
    process.exit(1);
  });
