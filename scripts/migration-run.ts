/* eslint-disable no-console */
/**
 * Applies all pending migrations.
 */

import * as fs from 'fs';
import * as path from 'path';
import { runMigrations } from 'database/migration-runner';

// ── Constants ─────────────────────────────────────────────────────────────────

const ENV_PATH = path.join(process.cwd(), '.env');

// ── Load .env ─────────────────────────────────────────────────────────────────

if (fs.existsSync(ENV_PATH)) {
  fs.readFileSync(ENV_PATH, 'utf-8')
    .split('\n')
    .filter(
      (line) => line.trim() && !line.startsWith('#') && line.includes('=')
    )
    .forEach((line) => {
      const eqIndex = line.indexOf('=');
      const key = line.slice(0, eqIndex).trim();
      if (key && !process.env[key]) {
        process.env[key] = line
          .slice(eqIndex + 1)
          .trim()
          .replace(/^(['"])(.*)\1$/, '$2');
      }
    });
} else {
  console.error(
    'Error: .env not found. Create a .env file with values from .env.example first'
  );
  process.exit(1);
}

// ── Guards ────────────────────────────────────────────────────────────────────

const databaseUrl = process.env['DATABASE_URL'];

if (!databaseUrl) {
  console.error('Error: DATABASE_URL is not set. Add it to your .env file.');
  process.exit(1);
}

// ── Apply pending migrations ──────────────────────────────────────────────────

runMigrations(databaseUrl)
  .then(({ applied, skipped }) => {
    if (applied.length > 0) {
      console.log(
        `Applied ${applied.length} migration(s). ${skipped} already up to date.`
      );
    }
    process.exit(0);
  })
  .catch((err: unknown) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  });
