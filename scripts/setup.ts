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
import {
  generateInitialMigration,
  getMigrationTimestamp,
} from 'database/migration-generator';
import * as fs from 'fs';
import * as path from 'path';
import type { LobbyConfig, FieldDefinition, FieldType } from 'types/config';

// ── Constants ─────────────────────────────────────────────────────────────────

const CONFIG_PATH = path.join(process.cwd(), 'lobby.config.json');
const GITIGNORE_PATH = path.join(process.cwd(), '.gitignore');
const MIGRATIONS_DIR = path.join(process.cwd(), 'migrations');

const RESERVED_FIELD_NAMES = new Set([
  'id',
  'email',
  'position',
  'ip_address',
  'user_agent',
  'created_at',
  'updated_at',
]);

// ── Helpers ───────────────────────────────────────────────────────────────────

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

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  intro('Lobby — Waitlist Setup');
  const s = spinner();

  // ── Guard: already configured — setup runs once ───────────────────────────

  if (fs.existsSync(CONFIG_PATH)) {
    log.error('lobby.config.json already exists.');
    log.info('To edit or add fields, run: pnpm run fields');
    process.exit(1);
  }

  // ── Step 1: Waitlist name ─────────────────────────────────────────────────

  const waitlistName = await text({
    message: 'What is your waitlist called?',
    placeholder: 'Rota Early Access',
    validate: (v) =>
      v!.trim().length < 2 ? 'Name must be at least 2 characters.' : undefined,
  });
  bail(waitlistName);

  // ── Step 2: Built-in optional fields ─────────────────────────────────────

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

  // ── Step 3: Custom fields loop ────────────────────────────────────────────

  const customFields: Record<string, FieldDefinition> = {};

  while (true) {
    const wantsMore = await confirm({
      message:
        Object.keys(customFields).length === 0
          ? 'Do you want to add any custom fields?'
          : 'Add another custom field?',
    });
    bail(wantsMore);

    if (!wantsMore) {
      break;
    }

    const fieldName = await text({
      message: 'Field name (snake_case)',
      placeholder: 'phone_number',
      validate: (v) => {
        if (!isSnakeCase(v!)) return 'Must be snake_case (e.g. phone_number).';
        if (RESERVED_FIELD_NAMES.has(v!))
          return `"${v}" is a reserved field name.`;
        if (customFields[v!]) return `"${v}" is already defined.`;
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

    customFields[String(fieldName)] = {
      type: fieldType as FieldType,
      required: Boolean(fieldRequired),
    };
  }

  // ── Step 4: Email confirmation ────────────────────────────────────────────

  const emailEnabled = await confirm({
    message: 'Enable email confirmation? (requires Resend)',
  });
  bail(emailEnabled);

  let fromEmail: string | undefined;

  if (emailEnabled) {
    const from = await text({
      message: 'From email address',
      placeholder: 'hello@yourproduct.com',
      validate: (v) =>
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v!)
          ? undefined
          : 'Enter a valid email address.',
    });
    bail(from);
    fromEmail = String(from);
  }

  // ── Step 5: Summary ───────────────────────────────────────────────────────

  const fieldSummary = [
    'email         TEXT  NOT NULL  (fixed)',
    ...(wantsFirstName
      ? [`first_name    TEXT  ${firstNameRequired ? 'NOT NULL' : 'optional'}`]
      : []),
    ...(wantsLastName
      ? [`last_name     TEXT  ${lastNameRequired ? 'NOT NULL' : 'optional'}`]
      : []),
    ...Object.entries(customFields).map(
      ([name, def]) =>
        `${name.padEnd(14)}${def.type.padEnd(8)}${def.required ? 'NOT NULL' : 'optional'}`
    ),
  ].join('\n');

  note(
    `Waitlist : ${String(waitlistName)}\nFields   :\n${fieldSummary}\nEmail    : ${
      emailEnabled ? `enabled (from: ${fromEmail})` : 'disabled'
    }`,
    'Review'
  );

  const confirmed = await confirm({ message: 'Save this configuration?' });
  bail(confirmed);
  if (!confirmed) {
    cancel('Setup cancelled. Nothing was written.');
    process.exit(0);
  }

  // ── Step 6: Write lobby.config.json ──────────────────────────────────────

  s.start('Generating lobby.config.json...');

  const fields: Record<string, FieldDefinition> = {
    ...(wantsFirstName
      ? { first_name: { type: 'string', required: firstNameRequired } }
      : {}),
    ...(wantsLastName
      ? { last_name: { type: 'string', required: lastNameRequired } }
      : {}),
    ...customFields,
  };

  const config: LobbyConfig = {
    waitlist: { name: String(waitlistName), fields },
    email: {
      enabled: Boolean(emailEnabled),
      ...(fromEmail ? { from: fromEmail } : {}),
    },
  };

  fs.writeFileSync(
    CONFIG_PATH,
    JSON.stringify(config, null, 2) + '\n',
    'utf-8'
  );

  s.stop('lobby.config.json created.');

  // ── Step 7: Generate initial migration ──────────────────────────────────────

  s.start('Generating initial migration...');

  if (fs.existsSync(MIGRATIONS_DIR)) {
    fs.rmSync(MIGRATIONS_DIR, { recursive: true, force: true });
  }
  fs.mkdirSync(MIGRATIONS_DIR, { recursive: true });

  const filename = `${getMigrationTimestamp()}_initial_setup.sql`;
  const filePath = path.join(MIGRATIONS_DIR, filename);

  fs.writeFileSync(filePath, generateInitialMigration(config), 'utf-8');
  s.stop(`Migration file created: migrations/${filename}`);

  // ── Step 8: Make sure files are git ignored ──────────────────────────────────────

  ensureGitignored('lobby.config.json');
  ensureGitignored('migrations/');
  ensureGitignored('.env');

  outro('Next step: pnpm run migration:run');
}

main().catch((err: unknown) => {
  // eslint-disable-next-line no-console
  console.error('Unexpected error:', err instanceof Error ? err.message : err);
  process.exit(1);
});
