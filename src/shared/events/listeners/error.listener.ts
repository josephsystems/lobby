import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { SystemEvent } from '../names/system.event';

@Injectable()
export class ErrorListener {
  private readonly logger = new Logger(ErrorListener.name);

  @OnEvent(SystemEvent.ERROR)
  handleError(error: Error): void {
    this.logger.error(`An error occurred: ${error.message}`, error.stack);
  }
}
