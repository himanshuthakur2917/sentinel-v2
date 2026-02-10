import { registerAs } from '@nestjs/config';

export default registerAs('pino', () => ({
  // Log level based on environment
  level:
    process.env.LOG_LEVEL ||
    (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),

  // Use pretty print in development
  usePretty: process.env.NODE_ENV !== 'production',
}));
