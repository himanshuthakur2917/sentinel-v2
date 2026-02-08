import { Injectable } from '@nestjs/common';
import {
  LOG_LEVELS,
  LogLevel,
  COLORS,
  LEVEL_COLORS,
  LEVEL_LABELS,
} from './constants/log-levels.constant';
import {
  AuditLogEntry,
  RequestContext,
} from './interfaces/audit-log.interface';

@Injectable()
export class AuditService {
  /**
   * Log a success message to the console
   */
  success(
    message: string,
    context?: string,
    metadata?: Record<string, unknown>,
  ): void {
    this.log(LOG_LEVELS.SUCCESS, message, context, metadata);
  }

  /**
   * Log an info message to the console
   */
  info(
    message: string,
    context?: string,
    metadata?: Record<string, unknown>,
  ): void {
    this.log(LOG_LEVELS.INFO, message, context, metadata);
  }

  /**
   * Log a warning message to the console
   */
  warn(
    message: string,
    context?: string,
    metadata?: Record<string, unknown>,
  ): void {
    this.log(LOG_LEVELS.WARNING, message, context, metadata);
  }

  /**
   * Log an error message to the console
   */
  error(
    message: string,
    context?: string,
    metadata?: Record<string, unknown>,
  ): void {
    this.log(LOG_LEVELS.ERROR, message, context, metadata);
  }

  /**
   * Log a debug message to the console
   */
  debug(
    message: string,
    context?: string,
    metadata?: Record<string, unknown>,
  ): void {
    if (process.env.NODE_ENV === 'development') {
      this.log(LOG_LEVELS.DEBUG, message, context, metadata);
    }
  }

  /**
   * Log HTTP request/response to the console
   */
  logRequest(ctx: RequestContext): void {
    const { method, url, statusCode, duration, userId } = ctx;
    const level = this.getLogLevelFromStatus(statusCode);
    const userInfo = userId ? ` [User: ${userId}]` : '';
    const message = `${method} ${url} - ${statusCode} (${duration}ms)${userInfo}`;

    this.log(level, message, 'HTTP');
  }

  /**
   * Core logging method with colored terminal output
   */
  private log(
    level: LogLevel,
    message: string,
    context?: string,
    metadata?: Record<string, unknown>,
  ): void {
    const timestamp = new Date().toISOString();
    const color = LEVEL_COLORS[level];
    const label = LEVEL_LABELS[level];
    const contextStr = context
      ? `${COLORS.cyan}[${context}]${COLORS.reset} `
      : '';

    // Format: [TIMESTAMP] [LEVEL] [CONTEXT] Message
    const formattedLog = [
      `${COLORS.gray}[${timestamp}]${COLORS.reset}`,
      `${color}${COLORS.bright}${label}${COLORS.reset}`,
      contextStr,
      message,
    ].join(' ');

    console.log(formattedLog);

    // Log metadata if present
    if (metadata && Object.keys(metadata).length > 0) {
      console.log(
        `${COLORS.gray}  └─ ${JSON.stringify(metadata, null, 2).replace(/\n/g, '\n     ')}${COLORS.reset}`,
      );
    }
  }

  /**
   * Determine log level based on HTTP status code
   */
  private getLogLevelFromStatus(statusCode: number): LogLevel {
    if (statusCode >= 500) return LOG_LEVELS.ERROR;
    if (statusCode >= 400) return LOG_LEVELS.WARNING;
    if (statusCode >= 200 && statusCode < 300) return LOG_LEVELS.SUCCESS;
    return LOG_LEVELS.INFO;
  }

  /**
   * Persist audit log entry to database (placeholder for Supabase integration)
   */
  persistLog(entry: AuditLogEntry): void {
    // TODO: Integrate with Supabase to persist critical logs
    // This will be implemented in Phase 2 after database module is ready
    this.debug(
      'Audit log queued for persistence',
      'AuditService',
      JSON.parse(JSON.stringify(entry)) as Record<string, unknown>,
    );
  }

  /**
   * Create a formatted separator line for console output
   */
  separator(title?: string): void {
    const line = '─'.repeat(60);
    if (title) {
      console.log(`\n${COLORS.cyan}${line}${COLORS.reset}`);
      console.log(`${COLORS.cyan}  ${title}${COLORS.reset}`);
      console.log(`${COLORS.cyan}${line}${COLORS.reset}\n`);
    } else {
      console.log(`${COLORS.gray}${line}${COLORS.reset}`);
    }
  }

  /**
   * Log application startup banner
   */
  startupBanner(appName: string, port: number, env: string): void {
    const banner = `
${COLORS.cyan}╔═══════════════════════════════════════════════════════════╗
║                                                             ║
║   ${COLORS.bright}${COLORS.white}🚀 ${appName.toUpperCase()} API SERVER${COLORS.reset}${COLORS.cyan}                              ║
║                                                             ║
║   ${COLORS.green}✓${COLORS.cyan} Port:        ${COLORS.white}${port}${COLORS.cyan}                                      ║
║   ${COLORS.green}✓${COLORS.cyan} Environment: ${COLORS.white}${env}${COLORS.cyan}                              ║
║   ${COLORS.green}✓${COLORS.cyan} Status:      ${COLORS.green}Running${COLORS.cyan}                                 ║
║                                                             ║
╚═══════════════════════════════════════════════════════════╝${COLORS.reset}
`;
    console.log(banner);
  }
}
