export type FieldType = 'string' | 'number' | 'boolean';

export interface FieldDefinition {
  type: FieldType;
  required: boolean;
  maxLength?: number;
}

/**
 * Runtime-dynamic field values from lobby.config.json.
 * Keys and types are only known at deployment time,
 * so this is the honest compile-time representation.
 */
export type DynamicFieldValues = Record<string, string | number | boolean>;

export type EmailConfig = { enabled: true; from: string } | { enabled: false };

export interface PrivacyConfig {
  collectIp: boolean;
  collectUserAgent: boolean;
}

export interface LobbyConfig {
  waitlist: {
    name: string;
    /**
     * User-defined fields only. email is always a fixed column
     * and is never stored here — it is handled separately.
     */
    fields: Record<string, FieldDefinition>;
  };
  email: EmailConfig;
  privacy: PrivacyConfig;
}
