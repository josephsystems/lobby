import {
  intro,
  outro,
  text,
  confirm,
  cancel,
  note,
  log,
  spinner,
} from '@clack/prompts';
import * as fs from 'fs';
import * as path from 'path';
import { generateInitialMigration } from '../src/database/lib/migration-generator';
import { formatFieldLine } from './lib/preview';
import { PROJECT_ROOT } from '../src/shared/utils/paths.util';
import {
  type LobbyConfig,
  type EmailConfig,
  type PrivacyConfig,
  type FieldDefinition,
} from '../src/shared/types/config.types';
import { CONFIG_FILENAME } from '../src/shared/constants/config.constants';
import { bail } from './lib/validation';
import { CONFIG_PATH, MIGRATIONS_DIR } from './lib/paths';
import {
  promptFieldName,
  promptFieldType,
  promptRequired,
  promptMaxLength,
} from './lib/prompts';
import { saveConfig, writeMigration } from './lib/config-io';

// ── Interfaces ──────────────────────────────────────────
interface BuiltInFields {
  firstName: { enabled: boolean; required: boolean };
  lastName: { enabled: boolean; required: boolean };
}

// ── Constants ───────────────────────────────────────────

const GITIGNORE_PATH = path.join(PROJECT_ROOT, '.gitignore');

// ── Helpers ─────────────────────────────────────────────

/** Appends an entry to .gitignore. */
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

/** Exits early if lobby.config.json already exists (prevents accidental re-setup). */
function guardAlreadyConfigured(): void {
  if (fs.existsSync(CONFIG_PATH)) {
    log.error(`${CONFIG_FILENAME} already exists.`);
    log.info('To edit or add fields, run: pnpm run fields');
    process.exit(1);
  }
}

/** Prompts for the user-facing waitlist name. */
async function promptWaitlistName(): Promise<string> {
  const name = await text({
    message: 'What is your waitlist called?',
    placeholder: 'Rota Early Access',
    validate: (v) =>
      v!.trim().length < 2 ? 'Name must be at least 2 characters.' : undefined,
  });
  bail(name);
  return name;
}

/** Prompts for built-in first/last name fields and whether they are required. */
async function promptBuiltInFields(): Promise<BuiltInFields> {
  const wantsFirstName = await confirm({ message: 'Collect first name?' });
  bail(wantsFirstName);

  const firstNameRequired = wantsFirstName
    ? await promptRequired('first name')
    : false;

  const wantsLastName = await confirm({ message: 'Collect last name?' });
  bail(wantsLastName);

  const lastNameRequired = wantsLastName
    ? await promptRequired('last name')
    : false;

  return {
    firstName: { enabled: wantsFirstName, required: firstNameRequired },
    lastName: { enabled: wantsLastName, required: lastNameRequired },
  };
}

/** Prompts for privacy-sensitive data collection (IP, user-agent). */
async function promptPrivacyConfig(): Promise<PrivacyConfig> {
  const collectIp = await confirm({
    message: 'Collect IP addresses? (privacy-sensitive)',
  });
  bail(collectIp);

  const collectUserAgent = await confirm({
    message: 'Collect user-agent strings? (privacy-sensitive)',
  });
  bail(collectUserAgent);

  return { collectIp, collectUserAgent };
}

/** Collects zero or more custom field definitions in a loop. */
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

    const name = await promptFieldName(new Set(Object.keys(fields)));
    const type = await promptFieldType();
    const required = await promptRequired(name);

    let maxLength: number | undefined = undefined;
    if (type === 'string') {
      maxLength = await promptMaxLength(name);
    }

    fields[name] = {
      type,
      required,
      ...(maxLength !== undefined && { maxLength }),
    };
  }

  return fields;
}

/** Prompts for email confirmation settings (Resend integration). */
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

  return { enabled: true, from };
}

// ── Review & Write ──────────────────────────────────────

/** Assembles all prompt responses into a complete LobbyConfig object. */
function buildConfig(
  waitlistName: string,
  builtIn: BuiltInFields,
  customFields: Record<string, FieldDefinition>,
  email: EmailConfig,
  privacy: PrivacyConfig
): LobbyConfig {
  const fields: Record<string, FieldDefinition> = {
    ...(builtIn.firstName.enabled
      ? {
          first_name: {
            type: 'string',
            required: builtIn.firstName.required,
            maxLength: 50,
          },
        }
      : {}),
    ...(builtIn.lastName.enabled
      ? {
          last_name: {
            type: 'string',
            required: builtIn.lastName.required,
            maxLength: 50,
          },
        }
      : {}),
    ...customFields,
  };

  return {
    waitlist: { name: waitlistName, fields },
    email,
    privacy,
  };
}

/** Builds a tabular summary of fixed + user-defined columns for the review screen. */
function formatFieldSummary(
  builtIn: BuiltInFields,
  customFields: Record<string, FieldDefinition>,
  privacy: PrivacyConfig
): string {
  const fixedColumns = [
    'email         VARCHAR(320)  NOT NULL  (always collected)',
    'position      INTEGER       NOT NULL  (auto-assigned)',
    ...(privacy.collectIp
      ? ['ip_address    VARCHAR(45)   optional  (collected)']
      : ['ip_address    —             —         (disabled)']),
    ...(privacy.collectUserAgent
      ? ['user_agent    VARCHAR(1024) optional  (collected)']
      : ['user_agent    —             —         (disabled)']),
  ];

  const userColumns = [
    ...(builtIn.firstName.enabled
      ? [
          formatFieldLine('first_name', {
            type: 'string',
            required: builtIn.firstName.required,
            maxLength: 50,
          }),
        ]
      : []),
    ...(builtIn.lastName.enabled
      ? [
          formatFieldLine('last_name', {
            type: 'string',
            required: builtIn.lastName.required,
            maxLength: 50,
          }),
        ]
      : []),
    ...Object.entries(customFields).map(([name, def]) =>
      formatFieldLine(name, def)
    ),
  ];

  const separator = '─'.repeat(57);

  return [
    '── Fixed columns ──',
    ...fixedColumns,
    ...(userColumns.length > 0
      ? [separator, '── Your fields ──', ...userColumns]
      : []),
  ].join('\n');
}

/** Writes config and initial migration to disk, then updates .gitignore. */
async function confirmAndWrite(config: LobbyConfig): Promise<void> {
  const s = spinner();

  s.start(`Generating ${CONFIG_FILENAME}...`);
  saveConfig(config);
  s.stop(`${CONFIG_FILENAME} created.`);

  s.start('Generating initial migration...');

  if (fs.existsSync(MIGRATIONS_DIR)) {
    fs.rmSync(MIGRATIONS_DIR, { recursive: true, force: true });
  }

  const filename = writeMigration(
    generateInitialMigration(config),
    'initial_setup'
  );
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
  const privacy = await promptPrivacyConfig();
  const customFields = await promptCustomFields();
  const email = await promptEmailConfig();

  note(
    `Waitlist : ${waitlistName}\n\n\nFields   :\n${formatFieldSummary(builtIn, customFields, privacy)}\n\n\nEmail    : ${
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

  const config = buildConfig(
    waitlistName,
    builtIn,
    customFields,
    email,
    privacy
  );
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
