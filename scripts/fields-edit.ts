import {
  intro,
  outro,
  confirm,
  select,
  multiselect,
  note,
  log,
  spinner,
} from '@clack/prompts';
import type {
  FieldDefinition,
  LobbyConfig,
} from '../src/shared/types/config.types';
import { toSqlType } from '../src/database/lib/db-type-mapping';
import {
  generateEditColumnsMigration,
  generateDropColumnsMigration,
  type FieldEdit,
} from '../src/database/lib/migration-generator';
import { bail } from './lib/validation';
import { loadConfig, saveConfig, writeMigration } from './lib/config-io';
import {
  promptFieldName,
  promptFieldType,
  promptRequired,
  promptMaxLength,
} from './lib/prompts';

// ── Types ───────────────────────────────────────────────

type EditAction = 'rename' | 'type' | 'required' | 'maxLength';

/**
 * Collects field edits/deletions interactively, updates config,
 * and generates a migration.
 */
export async function runFieldsEdit(config?: LobbyConfig): Promise<void> {
  const activeConfig = config ?? loadConfig();
  const fields = activeConfig.waitlist.fields;
  const fieldNames = Object.keys(fields);

  if (fieldNames.length === 0) {
    log.info('No custom fields to edit. Run "pnpm run fields:add" first.');
    return;
  }

  const edits = new Map<string, FieldEdit>();
  const deletions = new Set<string>();

  // Track renames so subsequent iterations see the updated names (oldName → newName)
  const renames = new Map<string, string>();

  while (true) {
    // Build the current list, accounting for renames/deletions already queued
    const currentFields = fieldNames
      .filter((n) => !deletions.has(n))
      .map((n) => {
        const displayName = renames.get(n) ?? n;
        const def = fields[n]!;
        const alreadyEdited = edits.get(n);
        const hint = `${toSqlType(alreadyEdited?.new ?? def)} ${(alreadyEdited?.new.required ?? def.required) ? 'NOT NULL' : 'optional'}${alreadyEdited ? ' (edited)' : ''}`;
        return { value: n, label: displayName, hint };
      });

    if (currentFields.length === 0) {
      log.info('All fields have been deleted.');
      break;
    }

    const choice = await select<string>({
      message: 'Which field do you want to edit?',
      options: [...currentFields, { value: '__done__', label: 'Done editing' }],
    });
    bail(choice);
    if (choice === '__done__') break;

    const originalName = choice;
    const originalDef = fields[originalName]!;

    // If already edited, start from its current edited state
    const existingEdit = edits.get(originalName);
    const def = existingEdit ? existingEdit.new : originalDef;
    const displayName = renames.get(originalName) ?? originalName;

    const actionOptions: { value: EditAction | 'delete'; label: string }[] = [
      { value: 'rename', label: `Rename (currently "${displayName}")` },
      { value: 'type', label: `Change type (currently ${def.type})` },
      {
        value: 'required',
        label: `Change required (currently ${def.required ? 'yes' : 'no'})`,
      },
    ];

    if (def.type === 'string') {
      actionOptions.push({
        value: 'maxLength',
        label: `Change max length (currently ${def.maxLength ?? 255})`,
      });
    }

    actionOptions.push({ value: 'delete', label: '⚠ Delete this field' });

    const actions = await multiselect<EditAction | 'delete'>({
      message: `What do you want to change on "${displayName}"?`,
      options: actionOptions,
      required: true,
    });
    bail(actions);

    if (actions.includes('delete')) {
      const confirmDelete = await confirm({
        message: `Are you sure you want to DELETE "${displayName}"? This is irreversible.`,
      });
      bail(confirmDelete);

      if (confirmDelete) {
        deletions.add(originalName);
        edits.delete(originalName); // If deleted, remove any edits
        log.warn(`"${displayName}" marked for deletion.`);
        continue; // Skip other edits — field is being deleted
      }
    }

    const activeActions = actions.filter(
      (a): a is EditAction => a !== 'delete'
    );

    // ── Collect edits ───────────────────────────────────

    const newDef: FieldDefinition = { ...def };
    let newName = existingEdit?.newName;

    for (const action of activeActions) {
      switch (action) {
        case 'rename': {
          const allExistingNames = new Set([
            ...fieldNames.filter(
              (n) => n !== originalName && !deletions.has(n)
            ),
            ...Array.from(renames.entries())
              .filter(([oldName]) => oldName !== originalName)
              .map(([, nameVal]) => nameVal),
          ]);

          const name = await promptFieldName(allExistingNames, {
            message: `New name for "${displayName}" (snake_case)`,
            placeholder: displayName,
          });
          newName = name;
          renames.set(originalName, newName);
          break;
        }

        case 'type': {
          const type = await promptFieldType({
            message: `New type for "${displayName}"`,
            initialValue: def.type,
          });
          newDef.type = type;

          // If switching away from string, drop maxLength
          if (newDef.type !== 'string') {
            delete newDef.maxLength;
          }
          // If switching to string and no maxLength, prompt
          if (newDef.type === 'string' && !newDef.maxLength) {
            newDef.maxLength = await promptMaxLength(displayName);
          }
          break;
        }

        case 'required': {
          const required = await promptRequired(displayName, {
            message: `Make "${displayName}" required?`,
          });
          newDef.required = required;
          break;
        }

        case 'maxLength': {
          const len = await promptMaxLength(displayName, {
            message: `New max length for "${displayName}"?`,
            placeholder: String(def.maxLength ?? 255),
            required: true,
          });
          newDef.maxLength = len;
          break;
        }
      }
    }

    // Record the edit (preserving original old definition)
    edits.set(originalName, {
      name: originalName,
      old: existingEdit ? existingEdit.old : originalDef,
      new: newDef,
      ...(newName && { newName }),
    });
  }

  if (edits.size === 0 && deletions.size === 0) {
    log.info('No changes made.');
    return;
  }

  // ── Preview ───────────────────────────────────────────

  const previewLines: string[] = [];

  for (const edit of edits.values()) {
    const renamed = edit.newName && edit.newName !== edit.name;
    const typeChanged = edit.old.type !== edit.new.type;
    const lengthChanged = edit.old.maxLength !== edit.new.maxLength;
    const requiredChanged = edit.old.required !== edit.new.required;

    if (!renamed && !typeChanged && !lengthChanged && !requiredChanged)
      continue;

    const displayName = renamed ? `${edit.name} → ${edit.newName}` : edit.name;
    const changes: string[] = [];
    if (renamed) changes.push('rename');
    if (typeChanged) changes.push(`type: ${edit.old.type} → ${edit.new.type}`);
    if (lengthChanged)
      changes.push(
        `length: ${edit.old.maxLength ?? 255} → ${edit.new.maxLength ?? 255}`
      );
    if (requiredChanged)
      changes.push(`required: ${edit.old.required} → ${edit.new.required}`);

    previewLines.push(`${displayName}: ${changes.join(', ')}`);
  }

  for (const name of deletions) {
    previewLines.push(`${name}: DELETE (irreversible)`);
  }

  if (previewLines.length === 0) {
    log.info('No effective changes detected.');
    return;
  }

  note(previewLines.join('\n'), 'Changes summary');

  const confirmed = await confirm({ message: 'Apply these changes?' });
  bail(confirmed);
  if (!confirmed) {
    log.info('No changes made.');
    return;
  }

  // ── Apply ─────────────────────────────────────────────

  const s = spinner();
  const migrationParts: string[] = [];
  const allWarnings: string[] = [];
  const editsList = Array.from(edits.values());

  // Generate edit migration
  if (editsList.length > 0) {
    const editResult = generateEditColumnsMigration(editsList);
    if (editResult.sql) {
      migrationParts.push(editResult.sql);
      allWarnings.push(...editResult.warnings);
    }
  }

  // Generate delete migration
  if (deletions.size > 0) {
    const dropResult = generateDropColumnsMigration(Array.from(deletions));
    if (dropResult.sql) {
      migrationParts.push(dropResult.sql);
      allWarnings.push(...dropResult.warnings);
    }
  }

  // Update config
  s.start('Updating lobby.config.json...');

  // Apply edits to config (deleting key and re-assigning under new name if renamed)
  for (const edit of edits.values()) {
    delete activeConfig.waitlist.fields[edit.name];
    activeConfig.waitlist.fields[edit.newName ?? edit.name] = edit.new;
  }

  // Apply deletions to config
  for (const name of deletions) {
    delete activeConfig.waitlist.fields[name];
  }

  saveConfig(activeConfig);
  s.stop('lobby.config.json updated.');

  // 4. Write migration file
  if (migrationParts.length > 0) {
    s.start('Generating migration...');
    const combinedSql = migrationParts.join('\n');
    const filename = writeMigration(combinedSql, 'edit_fields');
    s.stop(`Migration created: migrations/${filename}`);
  }

  // Show warnings
  for (const warning of allWarnings) {
    log.warn(warning);
  }

  if (migrationParts.length > 0) {
    note('Run "pnpm run migration:run" to apply.', 'Next step');
  }
}

// ── Main ────────────────────────────────────────────────

async function main(): Promise<void> {
  intro('Lobby — Edit Fields');
  await runFieldsEdit();
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
