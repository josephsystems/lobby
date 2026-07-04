import type {
  FieldDefinition,
  FieldValue,
} from '../../src/shared/types/config.types';
import { toSqlType } from '../../src/database/lib/db-type-mapping';

// ── Constants ───────────────────────────────────────────

const NAME_PAD = 20;
const TYPE_PAD = 14;

// ── Preview Formatting ──────────────────────────────────

/** Formats a single field as a padded preview line (e.g. for CLI note output). */
export function formatFieldLine(
  name: string,
  def: FieldDefinition,
  defaultValue?: FieldValue
): string {
  const sqlType = toSqlType(def);
  const req = def.required ? 'NOT NULL' : 'optional';
  const defSuffix =
    defaultValue !== undefined ? ` (default: ${defaultValue})` : '';
  return `${name.padEnd(NAME_PAD)} ${sqlType.padEnd(TYPE_PAD)} ${req}${defSuffix}`;
}

/**
 * Formats an array of collected fields into a multi-line preview string.
 * Used by fields-add and setup to show a consistent field summary.
 */
export function formatFieldLines(
  fields: {
    name: string;
    definition: FieldDefinition;
    defaultValue?: FieldValue;
  }[]
): string {
  return fields
    .map((f) => formatFieldLine(f.name, f.definition, f.defaultValue))
    .join('\n');
}
