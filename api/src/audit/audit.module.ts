import { Module, Global } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { LoggerModule, Params } from 'nestjs-pino';
import { ConfigService } from '@nestjs/config';
import { IncomingMessage, ServerResponse } from 'http';
import type { LevelWithSilent } from 'pino';
import { AuditService } from './audit.service';
import { AuditInterceptor } from './audit.interceptor';

// Define types for pino-http serializers
interface SerializedRequest {
  id: string;
  method: string;
  url: string;
  headers: Record<string, string | undefined>;
}

interface SerializedResponse {
  statusCode: number;
}

/**
 * Global Audit Module
 *
 * Provides centralized logging and audit trail functionality using Pino.
 * When imported, this module:
 * - Configures Pino logger with pretty printing for development
 * - Registers AuditService globally for dependency injection
 * - Attaches AuditInterceptor to all HTTP requests automatically
 * - Adds request correlation IDs for tracing
 *
 * Features:
 * - Colored terminal output with background colors for log levels
 * - JSON structured logging in production
 * - Automatic HTTP request/response logging with trace IDs
 * - Sensitive data sanitization (passwords, tokens, etc.)
 * - Custom @AuditLog() decorator for specific actions
 */
@Global()
@Module({
  imports: [
    LoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService): Params => {
        const isDev = configService.get('NODE_ENV') !== 'production';
        const logLevel =
          configService.get<string>('pino.level') || (isDev ? 'debug' : 'info');

        return {
          pinoHttp: {
            level: logLevel,
            // Generate unique request ID for tracing
            genReqId: (req: IncomingMessage): string => {
              const requestId = req.headers['x-request-id'];
              if (typeof requestId === 'string') {
                return requestId;
              }
              return crypto.randomUUID();
            },
            // Customize serializers to redact sensitive data
            serializers: {
              req: (
                req: IncomingMessage & { id?: string },
              ): SerializedRequest => ({
                id: req.id ?? '',
                method: req.method ?? 'GET',
                url: req.url ?? '/',
                // Redact sensitive headers
                headers: {
                  host: req.headers.host,
                  'user-agent': req.headers['user-agent'],
                  authorization: req.headers.authorization
                    ? '[REDACTED]'
                    : undefined,
                  cookie: req.headers.cookie ? '[REDACTED]' : undefined,
                },
              }),
              res: (res: ServerResponse): SerializedResponse => ({
                statusCode: res.statusCode,
              }),
            },
            // Custom log level based on status code
            customLogLevel: (
              _req: IncomingMessage,
              res: ServerResponse,
              err?: Error,
            ): LevelWithSilent => {
              if (res.statusCode >= 500 || err) return 'error';
              if (res.statusCode >= 400) return 'warn';
              return 'info';
            },
            // Pretty print configuration for development
            transport: isDev
              ? {
                  target: 'pino-pretty',
                  options: {
                    colorize: true,
                    levelFirst: true,
                    translateTime: 'SYS:yyyy-mm-dd HH:MM:ss.l',
                    ignore: 'pid,hostname',
                    messageFormat: '{context} | {msg}',
                    customColors:
                      'error:bgRed,warn:bgYellow,info:bgBlue,debug:bgGray,trace:bgWhite,fatal:bgMagenta',
                  },
                }
              : undefined,
          },
        };
      },
    }),
  ],
  providers: [
    AuditService,
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditInterceptor,
    },
  ],
  exports: [AuditService],
})
export class AuditModule {}
