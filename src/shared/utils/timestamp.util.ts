/**
 * Returns a YYYYMMDDHHMMSS timestamp string for use in
 * migration filenames. Lexicographic sort == chronological order.
 */
export function getMigrationTimestamp(): string {
  return new Date().toISOString().replace(/\D/g, '').slice(0, 14);
}
