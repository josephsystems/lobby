import { text, confirm, select } from '@clack/prompts';
import type { FieldType } from '../../src/shared/types/config.types';
import {
  bail,
  isReserved,
  isSnakeCase,
  isSqlReservedKeyword,
  RESERVED_FIELDS,
} from './validation';

// ── Constants ───────────────────────────────────────────

export const FIELD_TYPE_OPTIONS = [
  { value: 'string' as const, label: 'string', hint: 'text, emails, URLs' },
  { value: 'number' as const, label: 'number', hint: 'integers, decimals' },
  { value: 'boolean' as const, label: 'boolean', hint: 'true / false' },
];

// ── Interfaces ──────────────────────────────────────────

export interface PromptFieldNameOptions {
  message?: string;
  placeholder?: string;
}

export interface PromptFieldTypeOptions {
  message?: string;
  initialValue?: FieldType;
}

export interface PromptRequiredOptions {
  message?: string;
}

export interface PromptMaxLengthOptions {
  message?: string;
  placeholder?: string;
  required?: boolean;
}

// ── Reusable Field Prompts ──────────────────────────────

/**
 * Prompts for a field name with snake_case + reserved + duplicate validation.
 * @param existingNames – field names already defined (to prevent duplicates)
 * @param options – optional custom message and placeholder settings
 */
export async function promptFieldName(
  existingNames: Set<string>,
  options?: PromptFieldNameOptions
): Promise<string> {
  const name = await text({
    message: options?.message ?? 'Field name (snake_case)',
    placeholder: options?.placeholder ?? 'phone_number',
    validate: (v) => {
      if (!v || !v.trim()) return 'Field name is required.';
      if (!isSnakeCase(v)) return 'Must be snake_case (e.g. phone_number).';
      if (isReserved(v)) return `"${v}" is reserved: ${RESERVED_FIELDS[v]}`;
      if (isSqlReservedKeyword(v))
        return `"${v}" is a SQL reserved keyword and cannot be used as a field name.`;
      if (existingNames.has(v)) return `"${v}" is already defined.`;
      return undefined;
    },
  });
  bail(name);
  return name;
}

/**
 * Prompts for a field type selection.
 * @param options – optional custom message and initial value settings
 */
export async function promptFieldType(
  options?: PromptFieldTypeOptions
): Promise<FieldType> {
  const type = await select<FieldType>({
    message: options?.message ?? 'Field type',
    options: FIELD_TYPE_OPTIONS,
    initialValue: options?.initialValue,
  });
  bail(type);
  return type;
}

/**
 * Prompts for whether a field is required.
 * @param fieldName – display name of the field
 * @param options – optional custom message settings
 */
export async function promptRequired(
  fieldName: string,
  options?: PromptRequiredOptions
): Promise<boolean> {
  const required = await confirm({
    message: options?.message ?? `Is "${fieldName}" required?`,
  });
  bail(required);
  return required;
}

/**
 * Prompts for max length.
 * @param fieldName – display name of the field
 * @param options – optional custom message, placeholder, and validation settings
 */
export async function promptMaxLength(
  fieldName: string,
  options?: PromptMaxLengthOptions
): Promise<number> {
  const len = await text({
    message: options?.message ?? `Maximum character length for "${fieldName}"?`,
    placeholder: options?.placeholder ?? '255',
    validate: (v) => {
      if (!v || !v.trim())
        return options?.required ? 'A value is required.' : undefined;
      const num = Number(v);
      if (isNaN(num) || num <= 0 || !Number.isInteger(num))
        return 'Must be a positive integer.';
      if (num > 10_485_760) return 'Must be ≤ 10_485_760.';
      return undefined;
    },
  });
  bail(len);
  return len ? Number(len) : 255;
}

/**
 * Prompts for a default value of the given type.
 *
 * When `required` is true, the user must provide a value (needed to
 * backfill existing rows with NOT NULL). When `required` is false,
 * the user can skip by pressing Enter — the column will have no default.
 */
export async function promptDefault(
  fieldName: string,
  type: FieldType,
  required: boolean
): Promise<string | number | boolean | undefined> {
  const suffix = required
    ? ' (required — used to backfill existing rows)'
    : ' (optional — press Enter to skip)';

  switch (type) {
    case 'boolean': {
      const value = await select<'true' | 'false' | 'none'>({
        message: `Default value for "${fieldName}"${suffix}`,
        options: [
          ...(required
            ? []
            : [{ value: 'none' as const, label: 'No default' }]),
          { value: 'true' as const, label: 'true' },
          { value: 'false' as const, label: 'false' },
        ],
      });
      bail(value);
      if (value === 'none') return undefined;
      return value === 'true';
    }

    case 'number': {
      const value = await text({
        message: `Default value for "${fieldName}"${suffix}`,
        placeholder: required ? '0' : 'press Enter to skip',
        validate: (v) => {
          if (!v || !v.trim()) {
            return required
              ? 'A default value is required for required fields.'
              : undefined;
          }
          const num = Number(v);
          if (isNaN(num) || !isFinite(num)) return 'Must be a valid number.';
          return undefined;
        },
      });
      bail(value);
      return value.trim() ? Number(value) : undefined;
    }

    case 'string': {
      const value = await text({
        message: `Default value for "${fieldName}"${suffix}`,
        placeholder: required ? 'e.g. unknown' : 'press Enter to skip',
        validate: (v) => {
          if (!v || !v.trim()) {
            return required
              ? 'A default value is required for required fields.'
              : undefined;
          }
          return undefined;
        },
      });
      bail(value);
      return value.trim() ? value : undefined;
    }
  }
}
