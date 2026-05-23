import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CreateEmailOptions, Resend } from 'resend';
import { ConfirmationEmailJobPayload } from '../payloads/email-job.payload';
import { LobbyConfigService } from '../../shared/lobby-config/lobby-config.service';

@Injectable()
export class ResendService {
  private readonly resend: Resend;

  constructor(
    private readonly configService: ConfigService,
    private readonly lobbyConfigService: LobbyConfigService
  ) {
    this.resend = new Resend(this.configService.get('RESEND_API_KEY'));
  }

  async sendConfirmationEmail(
    payload: ConfirmationEmailJobPayload
  ): Promise<void> {
    const emailConfig = this.lobbyConfigService.email;

    if (!emailConfig.enabled) return;

    /**
     * Map dynamic fields to match Resend's expected template variables type.
     * We explicitly convert boolean values to string representations (e.g., true -> "true")
     * because the Resend SDK only accepts string | number, and to ensure they render
     * legibly in the email templates.
     */
    const variables: Record<string, string | number> = {};
    for (const key in payload.fields) {
      if (Object.prototype.hasOwnProperty.call(payload.fields, key)) {
        const value = payload.fields[key]!;
        variables[key] = typeof value === 'boolean' ? String(value) : value;
      }
    }

    await this.sendMail({
      from: emailConfig.from,
      to: [payload.recipientEmail],
      template: {
        id: this.configService.get('RESEND_CONFIRMATION_TEMPLATE_ID') as string,
        variables,
      },
    });
  }

  private async sendMail(payload: CreateEmailOptions): Promise<void> {
    const { error } = await this.resend.emails.send(payload);

    if (error) throw error;
  }
}
