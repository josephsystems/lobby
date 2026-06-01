import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { Environment } from '../../shared/constants/environment.constants';

const isDev =
  (process.env['NODE_ENV'] ?? Environment.DEVELOPMENT) ===
  Environment.DEVELOPMENT;

export class ProcessorLogger {
  private static readonly loggers = new Map<string, Logger>();

  private static getLogger(processorName: string): Logger {
    let logger = this.loggers.get(processorName);
    if (!logger) {
      logger = new Logger(processorName);
      this.loggers.set(processorName, logger);
    }
    return logger;
  }

  private static getEventName(job: Job): string {
    return job.data?.event || job.name || 'unknown';
  }

  public static onActive(job: Job, processorName: string): void {
    const logger = this.getLogger(processorName);
    const attemptInfo =
      job.attemptsMade > 0 ? ` (Attempt #${job.attemptsMade + 1})` : '';
    logger.log(
      `Job ${job.id} [${this.getEventName(job)}]: Started processing${attemptInfo}`
    );
  }

  public static onCompleted(job: Job, processorName: string): void {
    const logger = this.getLogger(processorName);
    logger.log(
      `Job ${job.id} [${this.getEventName(job)}]: Completed successfully ${isDev ? `- Data: ${JSON.stringify(job.data)}` : ''}`
    );
  }

  public static onError(job: Job, processorName: string): void {
    const logger = this.getLogger(processorName);
    logger.error(
      `Job ${job.id} [${this.getEventName(job)}]: Failed ${isDev ? `- Data: ${JSON.stringify(job.data)}` : ''} - Reason: ${job.failedReason || 'Unknown error'}`,
      job.stacktrace?.join('\n')
    );
  }
}
