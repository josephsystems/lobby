import { isCancel, cancel } from '@clack/prompts';

// ── Reserved Fields ─────────────────────────────────────

export const RESERVED_FIELDS: Record<string, string> = {
  id: 'Auto-generated unique identifier.',
  email: 'Primary email address (always collected).',
  position: 'Auto-assigned waitlist position.',
  ip_address: 'Client IP address (configurable via privacy settings).',
  user_agent: 'Client user-agent string (configurable via privacy settings).',
  created_at: 'Timestamp of when the entry was created.',
  updated_at: 'Timestamp of when the entry was last updated.',
};

export const RESERVED_FIELD_NAMES = new Set(Object.keys(RESERVED_FIELDS));

// ── SQL Reserved Keywords ───────────────────────────────

export const SQL_RESERVED_KEYWORDS = new Set([
  'action',
  'all',
  'alter',
  'and',
  'any',
  'as',
  'between',
  'by',
  'cascade',
  'case',
  'cast',
  'check',
  'column',
  'comment',
  'constraint',
  'create',
  'cross',
  'current',
  'database',
  'default',
  'delete',
  'desc',
  'distinct',
  'drop',
  'else',
  'end',
  'except',
  'exists',
  'false',
  'fetch',
  'filter',
  'first',
  'for',
  'foreign',
  'from',
  'full',
  'grant',
  'group',
  'having',
  'in',
  'index',
  'inner',
  'insert',
  'into',
  'is',
  'join',
  'key',
  'last',
  'left',
  'level',
  'like',
  'limit',
  'name',
  'natural',
  'next',
  'no',
  'not',
  'null',
  'of',
  'offset',
  'on',
  'only',
  'or',
  'order',
  'outer',
  'over',
  'primary',
  'references',
  'result',
  'return',
  'returning',
  'right',
  'role',
  'row',
  'rows',
  'rule',
  'select',
  'sequence',
  'set',
  'some',
  'status',
  'table',
  'then',
  'to',
  'trigger',
  'true',
  'type',
  'union',
  'unique',
  'update',
  'user',
  'using',
  'value',
  'values',
  'view',
  'when',
  'where',
  'with',
]);

// ── Guards & Validators ────────────────────────────────

/**
 * Asserts that a @clack/prompts response was not cancelled.
 * Exits the process gracefully if the user pressed Ctrl+C.
 */
export function bail<T>(value: T): asserts value is Exclude<T, symbol> {
  if (isCancel(value)) {
    cancel('Operation cancelled.');
    process.exit(0);
  }
}

/** Checks whether a string is valid snake_case (lowercase, digits, underscores). */
export function isSnakeCase(value: string): boolean {
  return /^[a-z][a-z0-9_]*$/.test(value);
}

/** Checks whether a string is a SQL reserved keyword. */
export function isSqlReservedKeyword(value: string): boolean {
  return SQL_RESERVED_KEYWORDS.has(value.toLowerCase());
}

/** Checks whether a string is a reserved field name. */
export function isReserved(value: string): boolean {
  return RESERVED_FIELD_NAMES.has(value.toLowerCase());
}
