import { intro, outro, confirm, note, log, spinner } from '@clack/prompts';
import type {
  FieldDefinition,
  LobbyConfig,
  FieldValue,
} from '../src/shared/types/config.types';
import { generateAddColumnsMigration } from '../src/database/lib/migration-generator';
import { bail } from './lib/validation';
import { loadConfig, saveConfig, writeMigration } from './lib/config-io';
import {
  promptFieldName,
  promptFieldType,
  promptRequired,
  promptMaxLength,
  promptDefault,
} from './lib/prompts';
import { formatFieldLines } from './lib/preview';

// ── Interfaces ──────────────────────────────────────────

interface CollectedField {
  name: string;
  definition: FieldDefinition;
  defaultValue?: FieldValue | undefined;
}

// ── Core Flow ───────────────────────────────────────────

/**
 * Collects new field definitions interactively, updates config,
 * and generates a migration.
 */
export async function runFieldsAdd(config?: LobbyConfig): Promise<void> {
  const activeConfig = config ?? loadConfig();
  const allNames = new Set(Object.keys(activeConfig.waitlist.fields));
  const collected: CollectedField[] = [];

  // ── Collect new fields ────────────────────────────────

  while (true) {
    const wantsMore = await confirm({
      message:
        collected.length === 0 ? 'Add a new field?' : 'Add another field?',
    });
    bail(wantsMore);
    if (!wantsMore) break;

    const name = await promptFieldName(allNames);
    const type = await promptFieldType();
    const required = await promptRequired(name);

    let maxLength: number | undefined;
    if (type === 'string') {
      maxLength = await promptMaxLength(name);
    }

    const defaultValue = await promptDefault(name, type, required);

    collected.push({
      name,
      definition: {
        type,
        required,
        ...(maxLength !== undefined && { maxLength }),
      },
      defaultValue,
    });
    allNames.add(name);
  }

  if (collected.length === 0) {
    log.info('No fields added.');
    return;
  }

  // ── Preview ───────────────────────────────────────────

  const preview = formatFieldLines(
    collected.map((f) => ({
      name: f.name,
      definition: f.definition,
      defaultValue: f.defaultValue,
    }))
  );

  note(preview, `Adding ${collected.length} field(s)`);

  const confirmed = await confirm({ message: 'Apply these changes?' });
  bail(confirmed);
  if (!confirmed) {
    log.info('No changes made.');
    return;
  }

  // ── Apply ─────────────────────────────────────────────

  const s = spinner();

  // Build maps for the generator
  const newFields: Record<string, FieldDefinition> = {};
  const defaults: Record<string, FieldValue> = {};

  for (const f of collected) {
    newFields[f.name] = f.definition;
    if (f.defaultValue !== undefined) {
      defaults[f.name] = f.defaultValue;
    }
  }

  // Update config
  s.start('Updating lobby.config.json...');
  activeConfig.waitlist.fields = {
    ...activeConfig.waitlist.fields,
    ...newFields,
  };
  saveConfig(activeConfig);
  s.stop('lobby.config.json updated.');

  // Generate migration
  s.start('Generating migration...');
  const result = generateAddColumnsMigration(newFields, defaults);

  if (!result.sql) {
    s.stop('No migration needed.');
    return;
  }

  const filename = writeMigration(result.sql, 'add_fields');
  s.stop(`Migration created: migrations/${filename}`);

  // Show warnings
  for (const warning of result.warnings) {
    log.warn(warning);
  }

  note('Run "pnpm run migration:run" to apply.', 'Next step');
}

// ── Main ────────────────────────────────────────────────

async function main(): Promise<void> {
  intro('Lobby — Add Fields');
  await runFieldsAdd();
  outro('Done ✓');
}

if (require.main === module) {
  main().catch((err: unknown) => {
    // eslint-disable-next-line no-console
    console.error(
      'Unexpected error:',
      err instanceof Error ? err.message : err
    );
    process.exit(1);
  });
}
