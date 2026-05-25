import { DynamicFieldValues } from '../../types/config.types';

interface BaseEventPayload {
  recipientEmail: string;
}

export interface ConfirmationEmailEventPayload extends BaseEventPayload {
  fields: DynamicFieldValues;
}

export type EmailEventPayload = ConfirmationEmailEventPayload;
