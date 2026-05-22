import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { QueueName } from './enums/queue-name.enum';
import { CommunicationQueue } from './queues/communication.queue';

@Module({
  imports: [BullModule.registerQueue({ name: QueueName.COMMUNICATION_QUEUE })],
  providers: [CommunicationQueue],
  exports: [CommunicationQueue],
})
export class JobModule {}
