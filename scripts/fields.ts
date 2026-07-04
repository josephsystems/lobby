import { intro, outro, confirm, log } from '@clack/prompts';
import { bail } from './lib/validation';
import { loadConfig } from './lib/config-io';
import { runFieldsEdit } from './fields-edit';
import { runFieldsAdd } from './fields-add';

// ── Main ────────────────────────────────────────────────

async function main(): Promise<void> {
  intro('Lobby — Field Management');

  let config = loadConfig();
  const fieldCount = Object.keys(config.waitlist.fields).length;

  // 1. Edit existing fields (if any exist)
  if (fieldCount > 0) {
    const wantsEdit = await confirm({
      message: `You have ${fieldCount} custom field(s). Edit existing fields?`,
    });
    bail(wantsEdit);

    if (wantsEdit) {
      await runFieldsEdit(config);
      // Reload config after edit because it has changed on disk
      config = loadConfig();
    }
  } else {
    log.info('No existing custom fields.');
  }

  // 2. Add new fields
  const wantsAdd = await confirm({
    message: 'Add new fields?',
  });
  bail(wantsAdd);

  if (wantsAdd) {
    await runFieldsAdd(config);
  }

  outro('Done ✓');
}

main().catch((err: unknown) => {
  // eslint-disable-next-line no-console
  console.error('Unexpected error:', err instanceof Error ? err.message : err);
  process.exit(1);
});
