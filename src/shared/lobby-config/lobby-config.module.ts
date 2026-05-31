import { Global, Module, DynamicModule } from '@nestjs/common';
import { LOBBY_CONFIG_TOKEN } from '../constants/config.constants';
import { LobbyConfigService } from './lobby-config.service';
import type { LobbyConfig } from '../types/config.types';

// Global so every module can inject LobbyConfigService
// without needing to import LobbyConfigModule explicitly.
@Global()
@Module({})
export class LobbyConfigModule {
  static forRoot(config: LobbyConfig): DynamicModule {
    return {
      module: LobbyConfigModule,
      providers: [
        {
          provide: LOBBY_CONFIG_TOKEN,
          useValue: config,
        },
        LobbyConfigService,
      ],
      exports: [LOBBY_CONFIG_TOKEN, LobbyConfigService],
    };
  }
}
