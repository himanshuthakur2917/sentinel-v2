import { Module, Global } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AuditService } from './audit.service';
import { AuditInterceptor } from './audit.interceptor';

/**
 * Global Audit Module
 *
 * Provides centralized logging and audit trail functionality.
 * When imported, this module:
 * - Registers AuditService globally for dependency injection
 * - Attaches AuditInterceptor to all HTTP requests automatically
 *
 * Features:
 * - Colored terminal output for different log levels
 * - Automatic HTTP request/response logging
 * - Sensitive data sanitization (passwords, tokens, etc.)
 * - Custom @AuditLog() decorator for specific actions
 * - Database persistence for critical audit events (via Supabase)
 */
@Global()
@Module({
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
