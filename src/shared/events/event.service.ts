import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { EventMap } from './interfaces/event-map.interface';

@Injectable()
export class EventService {
  constructor(private readonly eventEmitter: EventEmitter2) {}

  /**
   * Type-safe wrapper around EventEmitter2.emit.
   * The EventMap enforces that each event name is paired
   * with its correct payload type at compile time.
   */
  emit<E extends keyof EventMap>(event: E, payload: EventMap[E]): void {
    this.eventEmitter.emit(event, payload);
  }
}
