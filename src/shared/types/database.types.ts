import { Generated } from 'kysely';

// ── Migration tracking table ────────────────────────────

export interface LobbyMigrationTable {
  id: Generated<number>;
  filename: string;
  applied_at: Generated<Date>;
}

// ── Waitlist entries table ──────────────────────────────
// These represent the fixed columns we know at compile time.
// User-defined columns are accessed at runtime via column names
// from LobbyConfigService — no index signature needed here.

export interface WaitlistEntriesTable {
  id: Generated<string>;
  email: string;
  position: number;
  ip_address: string | null;
  user_agent: string | null;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
}

// ── Master database schema ──────────────────────────────

export interface LobbyDatabase {
  _lobby_migrations: LobbyMigrationTable;
  waitlist_entries: WaitlistEntriesTable;
}
