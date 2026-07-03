import * as fs from 'fs';
import type { LobbyConfig } from '../../src/shared/types/config.types';
import { CONFIG_FILENAME } from '../../src/shared/constants/config.constants';
import { CONFIG_PATH } from './paths';

// Helpers ────────────────────────────────────────────────

/**
 * Returns a YYYYMMDDHHMMSS timestamp string for use in
 * migration filenames. Lexicographic sort == chronological order.
 */
export function getMigrationTimestamp(): string {
  return new Date().toISOString().replace(/\D/g, '').slice(0, 14);
}

// ── Config I/O ──────────────────────────────────────────

/**
 * Reads and parses lobby.config.json.
 * Exits with a helpful message if the file doesn't exist.
 */
export function loadConfig(): LobbyConfig {
  let raw: string;
  try {
    raw = fs.readFileSync(CONFIG_PATH, 'utf-8');
  } catch {
    // eslint-disable-next-line no-console
    console.error(
      `Error: ${CONFIG_FILENAME} not found. Run "pnpm run setup" first.`
    );
    process.exit(1);
  }

  return JSON.parse(raw) as LobbyConfig;
}

/**
 * Writes the config object back to lobby.config.json.
 */
export function saveConfig(config: LobbyConfig): void {
  fs.writeFileSync(
    CONFIG_PATH,
    JSON.stringify(config, null, 2) + '\n',
    'utf-8'
  );
}
