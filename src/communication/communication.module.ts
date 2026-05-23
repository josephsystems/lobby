import { Module } from '@nestjs/common';
import { JobModule } from '../job/job.module';
import { CommunicationService } from './communication.service';
import { CommunicationProcessor } from './processors/communication.processor';
import { CommunicationListener } from './listeners/communication.listener';
import { ResendService } from './email/resend.service';

@Module({
  imports: [JobModule],
  providers: [
    CommunicationService,
    CommunicationProcessor,
    CommunicationListener,
    ResendService,
  ],
  exports: [CommunicationService],
})
export class CommunicationModule {}
