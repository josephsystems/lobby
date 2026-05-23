import {
  OnQueueActive,
  OnQueueCompleted,
  OnQueueFailed,
  Process,
  Processor,
} from '@nestjs/bull';
import { Job } from 'bull';
import { QueueName } from '../../job/enums/queue-name.enum';
import { ProcessorLogger } from '../../job/utils/processor-logger';
import { JobName } from '../../job/enums/job-name.enum';
import {
  EmailJobPayload,
  ConfirmationEmailJobPayload,
} from '../payloads/email-job.payload';
import { CommunicationEvent } from '../../shared/events/names/communication.event';
import { ResendService } from '../email/resend.service';

@Processor(QueueName.COMMUNICATION_QUEUE)
export class CommunicationProcessor {
  constructor(private readonly resendService: ResendService) {}

  @OnQueueActive()
  onActive(job: Job): void {
    ProcessorLogger.onActive(job, CommunicationProcessor.name);
  }

  @OnQueueCompleted()
  onCompleted(job: Job): void {
    ProcessorLogger.onCompleted(job, CommunicationProcessor.name);
  }

  @OnQueueFailed()
  onFailed(job: Job): void {
    ProcessorLogger.onError(job, CommunicationProcessor.name);
  }

  @Process({ name: JobName.SEND_EMAIL, concurrency: 100 })
  async handleEmailCommunication(job: Job): Promise<void> {
    const data: EmailJobPayload = job.data;
    await this.handleMailService(data);
  }

  private async handleMailService(data: EmailJobPayload): Promise<void> {
    switch (data.event) {
      case CommunicationEvent.SEND_CONFIRMATION_EMAIL:
        await this.resendService.sendConfirmationEmail(
          data as ConfirmationEmailJobPayload
        );
        break;
      default:
        break;
    }
  }
}
