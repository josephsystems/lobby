import { CommunicationEvent } from '../names/communication.event';
import { ConfirmationEmailEventPayload } from '../payloads/email-event.payload';

export interface EventMap {
  [CommunicationEvent.SEND_CONFIRMATION_EMAIL]: ConfirmationEmailEventPayload;
}
