import { EmailJobPayload } from '../../communication/payloads/email-job.payload';
import { JobName } from '../enums/job-name.enum';

export type CommunicationJobConfig = {
  name: JobName.SEND_EMAIL;
  data: EmailJobPayload;
};
