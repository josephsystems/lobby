export type FieldType = 'string' | 'number' | 'boolean';

export interface FieldDefinition {
  type: FieldType;
  required: boolean;
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
  email: {
    enabled: boolean;
    from?: string;
  };
}
