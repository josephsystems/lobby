import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { InsertObject } from 'kysely';
import { DatabaseService } from '../database/database.service';
import { LobbyConfigService } from '../shared/lobby-config/lobby-config.service';
import { JoinDto } from './dto/join.dto';
import { JoinResponse } from './interfaces/join-response.interface';
import { PositionResponse } from './interfaces/position-response.interface';
import { LobbyDatabase } from '../shared/types/database.types';
import { EventService } from '../shared/events/event.service';
import { CommunicationEvent } from '../shared/events/names/communication.event';
import { ConfirmationEmailEventPayload } from '../shared/events/payloads/email-event.payload';
import { DynamicFieldValues } from '../shared/types/config.types';

@Injectable()
export class EntryService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly lobbyConfig: LobbyConfigService,
    private readonly eventService: EventService
  ) {}

  // ── Join ──────────────────────────────────────────────

  async join(
    dto: JoinDto,
    ip: string | undefined,
    userAgent: string | undefined
  ): Promise<JoinResponse> {
    // 1. Validate and sanitize dynamic fields against lobby.config.json
    const metadata = this.validateAndSanitize(dto.fields ?? {});

    const email = dto.email.toLowerCase();

    // 2. Check for duplicate
    const existing = await this.databaseService.db
      .selectFrom('waitlist_entries')
      .select(['id', 'email', 'position'])
      .where('email', '=', email)
      .executeTakeFirst();

    if (existing) {
      return {
        id: existing.id,
        email: existing.email,
        position: existing.position,
        message: "You're already on the list!",
        isNew: false,
      };
    }

    // 3. Insert entry
    const insertData = {
      email,
      ip_address: ip ?? null,
      user_agent: userAgent ?? null,
      ...metadata,
    } as InsertObject<LobbyDatabase, 'waitlist_entries'>;

    const entry = await this.databaseService.db
      .insertInto('waitlist_entries')
      .values(insertData)
      .returning(['id', 'email', 'position'])
      .executeTakeFirstOrThrow();

    if (this.lobbyConfig.email.enabled) {
      const communicationPayload: ConfirmationEmailEventPayload = {
        recipientEmail: entry.email,
        fields: metadata,
      };

      this.eventService.emit(
        CommunicationEvent.SEND_CONFIRMATION_EMAIL,
        communicationPayload
      );
    }

    return {
      id: entry.id,
      email: entry.email,
      position: entry.position,
      message: "You're on the list!",
      isNew: true,
    };
  }

  // ── Position ──────────────────────────────────────────

  async getPosition(email: string): Promise<PositionResponse> {
    const entry = await this.databaseService.db
      .selectFrom('waitlist_entries')
      .select(['email', 'position'])
      .where('email', '=', email.toLowerCase())
      .executeTakeFirst();

    if (!entry) {
      throw new NotFoundException('No entry found for this email address.');
    }

    return {
      email: entry.email,
      position: entry.position,
      message: 'Successfully retrieved position.',
    };
  }

  // ── Helpers ───────────────────────────────────────────

  /**
   * Validates dynamic fields against lobby.config.json and returns
   * only the declared fields. Unknown keys are silently dropped.
   */
  private validateAndSanitize(
    metadata: Record<string, unknown>
  ): DynamicFieldValues {
    const fields = this.lobbyConfig.fields;
    const sanitized: DynamicFieldValues = {};

    for (const [name, def] of Object.entries(fields)) {
      const value = metadata[name];
      const isEmpty = value === undefined || value === null || value === '';

      if (def.required && isEmpty) {
        throw new BadRequestException(
          `fields.${name} is required (expected ${def.type}).`
        );
      }

      if (!isEmpty) {
        if (typeof value !== def.type) {
          throw new BadRequestException(
            `fields.${name} must be a ${def.type}, got ${typeof value}.`
          );
        }
        sanitized[name] = value as string | number | boolean;
      }
    }

    return sanitized;
  }
}
