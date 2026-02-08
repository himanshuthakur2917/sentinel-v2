import { SetMetadata } from '@nestjs/common';

/**
 * Metadata key for audit log decorator
 */
export const AUDIT_LOG_KEY = 'audit_log';

/**
 * Audit log action configuration
 */
export interface AuditLogConfig {
  action: string;
  resource?: string;
  persist?: boolean; // If true, log will be persisted to database
}

/**
 * Decorator to mark controller methods for audit logging
 *
 * @example
 * ```typescript
 * @AuditLog({ action: 'USER_LOGIN', resource: 'auth', persist: true })
 * @Post('login')
 * async login(@Body() dto: LoginDto) { ... }
 * ```
 */
export const AuditLog = (config: AuditLogConfig) =>
  SetMetadata(AUDIT_LOG_KEY, config);

/**
 * Shorthand decorator for common actions
 */
export const AuditCreate = (resource: string) =>
  AuditLog({ action: 'CREATE', resource, persist: true });

export const AuditUpdate = (resource: string) =>
  AuditLog({ action: 'UPDATE', resource, persist: true });

export const AuditDelete = (resource: string) =>
  AuditLog({ action: 'DELETE', resource, persist: true });

export const AuditRead = (resource: string) =>
  AuditLog({ action: 'READ', resource, persist: false });
