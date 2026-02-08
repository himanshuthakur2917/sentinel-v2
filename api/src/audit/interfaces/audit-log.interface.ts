import { LogLevel } from '../constants/log-levels.constant';

/**
 * Audit log entry structure for database persistence
 */
export interface AuditLogEntry {
  userId?: string;
  action: string;
  resource?: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  status: 'success' | 'failure' | 'error';
  duration?: number;
}

/**
 * Request context for audit logging
 */
export interface RequestContext {
  method: string;
  url: string;
  statusCode: number;
  duration: number;
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
  body?: Record<string, unknown>;
  query?: Record<string, unknown>;
  params?: Record<string, unknown>;
}

/**
 * Console log entry for terminal output
 */
export interface ConsoleLogEntry {
  level: LogLevel;
  message: string;
  timestamp: Date;
  context?: string;
  metadata?: Record<string, unknown>;
}
