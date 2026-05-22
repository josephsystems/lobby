import { InjectQueue } from '@nestjs/bull';
import { Injectable } from '@nestjs/common';
import { Job, JobOptions, Queue } from 'bull';
import { QueueName } from '../enums/queue-name.enum';
import { JOB_DEFAULTS } from '../constants/job-defaults';
import { CommunicationJobConfig } from '../types/communication-job-config.type';

@Injectable()
export class CommunicationQueue {
  constructor(
    @InjectQueue(QueueName.COMMUNICATION_QUEUE)
    private readonly communicationQueue: Queue
  ) {}

  async create(options: CommunicationJobConfig): Promise<void> {
    const jobOpts: JobOptions = {
      priority: 0,
      attempts: JOB_DEFAULTS.JOB_ATTEMPTS,
      delay: JOB_DEFAULTS.JOB_DELAY,
      backoff: {
        type: 'exponential',
        delay: JOB_DEFAULTS.JOB_EXPONENTIAL_DELAY,
      },
      removeOnComplete: true,
    };

    await this.communicationQueue.add(options.name, options.data, jobOpts);
  }

  async getFailed(): Promise<Job[]> {
    return await this.communicationQueue.getFailed();
  }
}
