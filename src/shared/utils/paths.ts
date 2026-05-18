/**
 * Project root directory resolved once at startup.
 *
 * Uses PROJECT_ROOT env var if set (e.g. in Docker),
 * otherwise falls back to process.cwd() which is correct
 * when started via `nest start`, `node dist/main`, or `pnpm run`.
 */
export const PROJECT_ROOT = process.env['PROJECT_ROOT'] || process.cwd();
