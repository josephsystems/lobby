import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { InsertObject } from 'kysely';
import { DatabaseService } from '../database/database.service';
import { LobbyConfigService } from '../shared/lobby-config/lobby-config.service';
import { WaitlistJoinDto } from './dto/waitlist-join.dto';
import { WaitlistJoinResponse } from './interfaces/waitlist-join-response.interface';
import { WaitlistPositionResponse } from './interfaces/waitlist-position-response.interface';
import { LobbyDatabase } from '../shared/types/database.types';
import { EventService } from '../shared/events/event.service';
import { CommunicationEvent } from '../shared/events/names/communication.event';
import { ConfirmationEmailEventPayload } from '../shared/events/payloads/email-event.payload';
import { DynamicFieldValues } from '../shared/types/config.types';

@Injectable()
export class WaitlistService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly lobbyConfig: LobbyConfigService,
    private readonly eventService: EventService
  ) {}

  // ── Join ──────────────────────────────────────────────

  async join(
    dto: WaitlistJoinDto,
    ip: string | undefined,
    userAgent: string | undefined
  ): Promise<WaitlistJoinResponse> {
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

    // 3. Insert entry, respecting privacy settings
    const insertData: Record<string, unknown> = {
      email,
      ...metadata,
    };

    if (this.lobbyConfig.privacy.collectIp) {
      insertData['ip_address'] = ip ?? null;
    }
    if (this.lobbyConfig.privacy.collectUserAgent) {
      insertData['user_agent'] = userAgent ?? null;
    }

    const entry = await this.databaseService.db
      .insertInto('waitlist_entries')
      .values(insertData as InsertObject<LobbyDatabase, 'waitlist_entries'>)
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

  async getPosition(email: string): Promise<WaitlistPositionResponse> {
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
        if (typeof value === 'string') {
          const maxLen = def.maxLength || 255;
          if (value.length > maxLen) {
            throw new BadRequestException(
              `fields.${name} must not exceed ${maxLen} characters.`
            );
          }
        }
        sanitized[name] = value as string | number | boolean;
      }
    }

    return sanitized;
  }
}
