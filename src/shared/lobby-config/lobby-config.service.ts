import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { PROJECT_ROOT } from '../utils/paths.util';
import {
  type LobbyConfig,
  type EmailConfig,
  type FieldDefinition,
} from '../types/config.types';
import { CONFIG_FILENAME } from '../constants/config.constants';

@Injectable()
export class LobbyConfigService implements OnModuleInit {
  private readonly logger = new Logger(LobbyConfigService.name);
  private readonly configPath = path.join(PROJECT_ROOT, CONFIG_FILENAME);
  private config!: LobbyConfig;

  onModuleInit(): void {
    if (!fs.existsSync(this.configPath)) {
      throw new Error(
        `${CONFIG_FILENAME} not found. Run "npm run setup" first.`
      );
    }

    this.config = JSON.parse(
      fs.readFileSync(this.configPath, 'utf-8')
    ) as LobbyConfig;

    this.logger.log(`Loaded waitlist: "${this.config.waitlist.name}"`);
  }

  get name(): string {
    return this.config.waitlist.name;
  }

  get fields(): Record<string, FieldDefinition> {
    return this.config.waitlist.fields;
  }

  get email(): EmailConfig {
    return this.config.email;
  }
}
