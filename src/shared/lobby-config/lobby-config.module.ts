import { Global, Module } from '@nestjs/common';
import { LobbyConfigService } from './lobby-config.service';

// Global so every module can inject LobbyConfigService
// without needing to import LobbyConfigModule explicitly.
@Global()
@Module({
  providers: [LobbyConfigService],
  exports: [LobbyConfigService],
})
export class LobbyConfigModule {}
