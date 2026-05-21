import * as path from 'path';
import * as fs from 'fs';
import { PROJECT_ROOT } from './paths.util';

export function setEnvValue(key: string, value: string): void {
  const ENV_PATH = path.join(PROJECT_ROOT, '.env');
  const fileExists = fs.existsSync(ENV_PATH);

  if (!fileExists) {
    fs.writeFileSync(ENV_PATH, `${key}=${value}\n`, 'utf-8');
    return;
  }

  const content = fs.readFileSync(ENV_PATH, 'utf-8');
  const lines = content.split('\n');
  const existingIndex = lines.findIndex((line) =>
    line.trim().startsWith(`${key}=`)
  );

  if (existingIndex !== -1) {
    lines[existingIndex] = `${key}=${value}`;
    fs.writeFileSync(ENV_PATH, lines.join('\n'), 'utf-8');
  } else {
    const prefix = content.endsWith('\n') ? '' : '\n';
    fs.appendFileSync(ENV_PATH, `${prefix}${key}=${value}\n`, 'utf-8');
  }
}
