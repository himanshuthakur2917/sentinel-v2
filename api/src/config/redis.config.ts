import { registerAs } from '@nestjs/config';

export default registerAs('redis', () => {
  const parseIntSafe = (
    value: string | undefined,
    defaultValue: number,
  ): number => {
    if (!value) return defaultValue;
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? defaultValue : parsed;
  };

  return {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseIntSafe(process.env.REDIS_PORT, 6379),
    password: process.env.REDIS_PASSWORD || undefined,
    db: parseIntSafe(process.env.REDIS_DB, 0),
    keyPrefix: 'sentinel:',
  };
});
