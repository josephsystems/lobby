import { ConfigService } from '@nestjs/config';

export interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  username?: string;
}

/**
 * Shared Redis connection config used by both ThrottlerModule
 * and BullModule so connection details are defined in one place.
 */
export function getRedisConfig(config: ConfigService): RedisConfig {
  return {
    host: config.get<string>('REDIS_HOST')!,
    port: config.get<number>('REDIS_PORT')!,
    password: config.get<string>('REDIS_PASSWORD'),
    username: config.get<string>('REDIS_USER'),
  };
}
