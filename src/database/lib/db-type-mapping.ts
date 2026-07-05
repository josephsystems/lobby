import type {
  FieldDefinition,
  FieldType,
} from '../../shared/types/config.types';

export const SQL_TYPE: Record<FieldType, string> = {
  string: 'VARCHAR',
  number: 'NUMERIC',
  boolean: 'BOOLEAN',
};

/** Converts a FieldDefinition to its PostgreSQL type string (e.g. VARCHAR(255)). */
export function toSqlType(def: FieldDefinition): string {
  return def.type === 'string'
    ? `${SQL_TYPE[def.type]}(${def.maxLength ?? 255})`
    : SQL_TYPE[def.type];
}
