import {
  intro,
  outro,
  text,
  confirm,
  select,
  isCancel,
  cancel,
  note,
  log,
  spinner,
} from '@clack/prompts';
import * as fs from 'fs';
import * as path from 'path';
import { generateInitialMigration } from '../src/database/lib/migration-generator';
import { getMigrationTimestamp } from '../src/shared/utils/timestamp.util';
import { PROJECT_ROOT } from '../src/shared/utils/paths.util';
import {
  type LobbyConfig,
  type EmailConfig,
  type FieldDefinition,
  type FieldType,
} from '../src/shared/types/config.types';
import { CONFIG_FILENAME } from '../src/shared/constants/config.constants';
import { setEnvValue } from '../src/shared/utils/env.util';

// ── Constants ───────────────────────────────────────────

const CONFIG_PATH = path.join(PROJECT_ROOT, CONFIG_FILENAME);
const GITIGNORE_PATH = path.join(PROJECT_ROOT, '.gitignore');
const MIGRATIONS_DIR = path.join(PROJECT_ROOT, 'migrations');

const RESERVED_FIELD_NAMES = new Set([
  'id',
  'email',
  'position',
  'ip_address',
  'user_agent',
  'created_at',
  'updated_at',
]);

// ── Helpers ─────────────────────────────────────────────

function bail(value: unknown): asserts value is never {
  if (isCancel(value)) {
    cancel('Setup cancelled.');
    process.exit(0);
  }
}

function isSnakeCase(value: string): boolean {
  return /^[a-z][a-z0-9_]*$/.test(value);
}

function ensureGitignored(entry: string): void {
  if (!fs.existsSync(GITIGNORE_PATH)) {
    fs.writeFileSync(GITIGNORE_PATH, `${entry}\n`, 'utf-8');
    return;
  }

  const content = fs.readFileSync(GITIGNORE_PATH, 'utf-8');
  const alreadyIgnored = content
    .split('\n')
    .some((line) => !line.startsWith('#') && line.trim() === entry);

  if (!alreadyIgnored) {
    fs.appendFileSync(GITIGNORE_PATH, `\n${entry}\n`);
  }
}

// ── Prompts ─────────────────────────────────────────────

function guardAlreadyConfigured(): void {
  if (fs.existsSync(CONFIG_PATH)) {
    log.error(`${CONFIG_FILENAME} already exists.`);
    log.info('To edit or add fields, run: pnpm run fields');
    process.exit(1);
  }
}

async function promptWaitlistName(): Promise<string> {
  const name = await text({
    message: 'What is your waitlist called?',
    placeholder: 'Rota Early Access',
    validate: (v) =>
      v!.trim().length < 2 ? 'Name must be at least 2 characters.' : undefined,
  });
  bail(name);
  return String(name);
}

interface BuiltInFields {
  firstName: { enabled: boolean; required: boolean };
  lastName: { enabled: boolean; required: boolean };
}

async function promptBuiltInFields(): Promise<BuiltInFields> {
  const wantsFirstName = await confirm({ message: 'Collect first name?' });
  bail(wantsFirstName);

  let firstNameRequired = false;
  if (wantsFirstName) {
    const r = await confirm({ message: 'Is first name required?' });
    bail(r);
    firstNameRequired = r;
  }

  const wantsLastName = await confirm({ message: 'Collect last name?' });
  bail(wantsLastName);

  let lastNameRequired = false;
  if (wantsLastName) {
    const r = await confirm({ message: 'Is last name required?' });
    bail(r);
    lastNameRequired = r;
  }

  return {
    firstName: { enabled: wantsFirstName, required: firstNameRequired },
    lastName: { enabled: wantsLastName, required: lastNameRequired },
  };
}

async function promptCustomFields(): Promise<Record<string, FieldDefinition>> {
  const fields: Record<string, FieldDefinition> = {};

  while (true) {
    const wantsMore = await confirm({
      message:
        Object.keys(fields).length === 0
          ? 'Do you want to add any custom fields?'
          : 'Add another custom field?',
    });
    bail(wantsMore);

    if (!wantsMore) break;

    const fieldName = await text({
      message: 'Field name (snake_case)',
      placeholder: 'phone_number',
      validate: (v) => {
        if (!v || !v.trim()) return 'Field name is required.';
        if (!isSnakeCase(v)) return 'Must be snake_case (e.g. phone_number).';
        if (RESERVED_FIELD_NAMES.has(v))
          return `"${v}" is a reserved field name.`;
        if (fields[v]) return `"${v}" is already defined.`;
        return undefined;
      },
    });
    bail(fieldName);

    const fieldType = await select<FieldType>({
      message: 'Field type',
      options: [
        { value: 'string', label: 'string', hint: 'text, emails, URLs' },
        { value: 'number', label: 'number', hint: 'integers, decimals' },
        { value: 'boolean', label: 'boolean', hint: 'true / false' },
      ],
    });
    bail(fieldType);

    const fieldRequired = await confirm({
      message: `Is "${fieldName}" required?`,
    });
    bail(fieldRequired);

    fields[String(fieldName)] = {
      type: fieldType as FieldType,
      required: Boolean(fieldRequired),
    };
  }

  return fields;
}

async function promptEmailConfig(): Promise<EmailConfig> {
  const enabled = await confirm({
    message: 'Enable email confirmation? (requires Resend)',
  });
  bail(enabled);

  if (!enabled) return { enabled: false };

  const from = await text({
    message: 'From email address',
    placeholder: 'hello@yourproduct.com',
    validate: (v) =>
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v!)
        ? undefined
        : 'Enter a valid email address.',
  });
  bail(from);

  return { enabled: true, from: String(from) };
}

// ── Review & Write ──────────────────────────────────────

function buildConfig(
  waitlistName: string,
  builtIn: BuiltInFields,
  customFields: Record<string, FieldDefinition>,
  email: EmailConfig
): LobbyConfig {
  const fields: Record<string, FieldDefinition> = {
    ...(builtIn.firstName.enabled
      ? { first_name: { type: 'string', required: builtIn.firstName.required } }
      : {}),
    ...(builtIn.lastName.enabled
      ? { last_name: { type: 'string', required: builtIn.lastName.required } }
      : {}),
    ...customFields,
  };

  return {
    waitlist: { name: waitlistName, fields },
    email,
  };
}

function formatFieldSummary(
  builtIn: BuiltInFields,
  customFields: Record<string, FieldDefinition>
): string {
  return [
    'email         TEXT  NOT NULL  (fixed)',
    ...(builtIn.firstName.enabled
      ? [
          `first_name    TEXT  ${builtIn.firstName.required ? 'NOT NULL' : 'optional'}`,
        ]
      : []),
    ...(builtIn.lastName.enabled
      ? [
          `last_name     TEXT  ${builtIn.lastName.required ? 'NOT NULL' : 'optional'}`,
        ]
      : []),
    ...Object.entries(customFields).map(
      ([name, def]) =>
        `${name.padEnd(14)}${def.type.padEnd(8)}${def.required ? 'NOT NULL' : 'optional'}`
    ),
  ].join('\n');
}

async function confirmAndWrite(config: LobbyConfig): Promise<void> {
  const s = spinner();

  s.start(`Generating ${CONFIG_FILENAME}...`);
  fs.writeFileSync(
    CONFIG_PATH,
    JSON.stringify(config, null, 2) + '\n',
    'utf-8'
  );
  s.stop(`${CONFIG_FILENAME} created.`);

  s.start('Writing EMAIL_ENABLED to .env...');
  setEnvValue('EMAIL_ENABLED', String(config.email.enabled));
  s.stop('EMAIL_ENABLED written to .env.');

  s.start('Generating initial migration...');
  if (fs.existsSync(MIGRATIONS_DIR)) {
    fs.rmSync(MIGRATIONS_DIR, { recursive: true, force: true });
  }
  fs.mkdirSync(MIGRATIONS_DIR, { recursive: true });

  const filename = `${getMigrationTimestamp()}_initial_setup.sql`;
  const filePath = path.join(MIGRATIONS_DIR, filename);
  fs.writeFileSync(filePath, generateInitialMigration(config), 'utf-8');
  s.stop(`Migration file created: migrations/${filename}`);

  ensureGitignored(CONFIG_FILENAME);
  ensureGitignored('migrations/');
  ensureGitignored('.env');
}

// ── Main ────────────────────────────────────────────────

async function main(): Promise<void> {
  intro('Lobby — Waitlist Setup');

  guardAlreadyConfigured();

  const waitlistName = await promptWaitlistName();
  const builtIn = await promptBuiltInFields();
  const customFields = await promptCustomFields();
  const email = await promptEmailConfig();

  note(
    `Waitlist : ${waitlistName}\nFields   :\n${formatFieldSummary(builtIn, customFields)}\nEmail    : ${
      email.enabled ? `enabled (from: ${email.from})` : 'disabled'
    }`,
    'Review'
  );

  const confirmed = await confirm({ message: 'Save this configuration?' });
  bail(confirmed);
  if (!confirmed) {
    cancel('Setup cancelled. Nothing was written.');
    process.exit(0);
  }

  const config = buildConfig(waitlistName, builtIn, customFields, email);
  await confirmAndWrite(config);

  note(
    '1. Fill in your .env values (sample at .env.example)\n2. Run pnpm run migration:run',
    'Next steps'
  );
  outro('Good luck with your launch 🚀');
}

main().catch((err: unknown) => {
  // eslint-disable-next-line no-console
  console.error('Unexpected error:', err instanceof Error ? err.message : err);
  process.exit(1);
});
