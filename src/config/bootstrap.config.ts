import * as fs from 'fs';
import * as path from 'path';
import { CONFIG_FILENAME } from '../shared/constants/config.constants';
import type { LobbyConfig } from '../shared/types/config.types';

export interface BootstrapConfig {
  emailEnabled: boolean;
  lobbyConfig: LobbyConfig;
}

/**
 * Performs fail-fast validations on the file system and environment variables
 * prior to NestJS bootstrapping to ensure dependencies are fully satisfied.
 */
export function loadAndValidateConfig(): BootstrapConfig {
  const configPath = path.join(
    process.env['PROJECT_ROOT'] || process.cwd(),
    CONFIG_FILENAME
  );

  // 1. Gracefully handle missing waitlist configuration
  if (!fs.existsSync(configPath)) {
    // eslint-disable-next-line no-console
    console.error(
      `\x1b[31m[Config Error] ${CONFIG_FILENAME} not found. Run "npm run setup" first.\x1b[0m`
    );
    process.exit(1);
  }

  const lobbyConfig = JSON.parse(
    fs.readFileSync(configPath, 'utf-8')
  ) as LobbyConfig;

  // 2. Validate environment variables based on waitlist configuration
  if (lobbyConfig.email.enabled) {
    const requiredEnvVars = [
      'REDIS_HOST',
      'REDIS_PORT',
      'RESEND_API_KEY',
      'RESEND_CONFIRMATION_TEMPLATE_ID',
    ];

    const missing = requiredEnvVars.filter((key) => !process.env[key]);

    if (missing.length > 0) {
      // eslint-disable-next-line no-console
      console.error(
        `\x1b[31m[Config Error] Email configuration is enabled in ${CONFIG_FILENAME}, but the following environment variables are missing:\x1b[0m`
      );
      // eslint-disable-next-line no-console
      missing.forEach((key) => console.error(`  - \x1b[33m${key}\x1b[0m`));
      // eslint-disable-next-line no-console
      console.error(`\x1b[31mPlease define them in your .env file.\x1b[0m`);
      process.exit(1);
    }
  }

  return {
    emailEnabled: lobbyConfig.email.enabled,
    lobbyConfig,
  };
}
