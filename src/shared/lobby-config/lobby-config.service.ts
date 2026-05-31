import { Injectable, Logger, Inject } from '@nestjs/common';
import { LOBBY_CONFIG_TOKEN } from '../constants/config.constants';
import {
  type LobbyConfig,
  type EmailConfig,
  type FieldDefinition,
  type PrivacyConfig,
} from '../types/config.types';

@Injectable()
export class LobbyConfigService {
  private readonly logger = new Logger(LobbyConfigService.name);

  constructor(
    @Inject(LOBBY_CONFIG_TOKEN) private readonly config: LobbyConfig
  ) {
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

  get privacy(): PrivacyConfig {
    return this.config.privacy;
  }
}
