// Audit Module - Centralized Logging & Audit Trail
export { AuditModule } from './audit.module';
export { AuditService } from './audit.service';
export { AuditInterceptor } from './audit.interceptor';
export {
  AuditLog,
  AuditCreate,
  AuditUpdate,
  AuditDelete,
  AuditRead,
  AUDIT_LOG_KEY,
  type AuditLogConfig,
} from './decorators/audit-log.decorator';
export {
  LOG_LEVELS,
  COLORS,
  LEVEL_COLORS,
  LEVEL_LABELS,
  type LogLevel,
} from './constants/log-levels.constant';
export type {
  AuditLogEntry,
  RequestContext,
  ConsoleLogEntry,
} from './interfaces/audit-log.interface';
