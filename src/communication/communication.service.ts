import { Injectable } from '@nestjs/common';
import { EmailJobPayload } from './payloads/email-job.payload';
import { CommunicationQueue } from '../job/queues/communication.queue';
import { CommunicationChannel } from './enums/communication-channel.enum';
import { JobName } from '../job/enums/job-name.enum';

@Injectable()
export class CommunicationService {
  constructor(private readonly communicationQueue: CommunicationQueue) {}

  async dispatchCommunications(payload: EmailJobPayload): Promise<void> {
    if (payload.channels.includes(CommunicationChannel.EMAIL)) {
      await this.communicationQueue.create({
        name: JobName.SEND_EMAIL,
        data: payload,
      });
    }
  }
}
