import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { CommunicationEvent } from '../../shared/events/names/communication.event';
import { ConfirmationEmailEventPayload } from '../../shared/events/payloads/email-event.payload';
import { ConfirmationEmailJobPayload } from '../payloads/email-job.payload';
import { CommunicationChannel } from '../enums/communication-channel.enum';
import { CommunicationService } from '../communication.service';

@Injectable()
export class CommunicationListener {
  constructor(private readonly communicationService: CommunicationService) {}

  @OnEvent(CommunicationEvent.SEND_CONFIRMATION_EMAIL)
  async onSendConfirmationEmail(
    payload: ConfirmationEmailEventPayload
  ): Promise<void> {
    const jobPayload: ConfirmationEmailJobPayload = {
      event: CommunicationEvent.SEND_CONFIRMATION_EMAIL,
      recipientEmail: payload.recipientEmail,
      channels: [CommunicationChannel.EMAIL],
      fields: payload.fields,
      position: payload.position,
    };

    await this.communicationService.dispatchCommunications(jobPayload);
  }
}
