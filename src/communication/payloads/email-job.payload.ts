import { CommunicationChannel } from '../enums/communication-channel.enum';
import { CommunicationEvent } from '../../shared/events/names/communication.event';
import { DynamicFieldValues } from '../../shared/types/config.types';

interface BaseJobPayload {
  event: CommunicationEvent;
  channels: CommunicationChannel[];
  recipientEmail: string;
}

export interface ConfirmationEmailJobPayload extends BaseJobPayload {
  fields: DynamicFieldValues;
}

// Union of all email job payloads
export type EmailJobPayload = ConfirmationEmailJobPayload;
