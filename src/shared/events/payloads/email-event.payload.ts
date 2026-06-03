import { DynamicFieldValues } from '../../types/config.types';

interface BaseEventPayload {
  recipientEmail: string;
}

export interface ConfirmationEmailEventPayload extends BaseEventPayload {
  position: number;
  fields: DynamicFieldValues;
}

export type EmailEventPayload = ConfirmationEmailEventPayload;
