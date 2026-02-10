import { Injectable } from '@nestjs/common';
import { PinoLogger, InjectPinoLogger } from 'nestjs-pino';
import { COLORS } from './constants/log-levels.constant';
import {
  AuditLogEntry,
  RequestContext,
} from './interfaces/audit-log.interface';

@Injectable()
export class AuditService {
  constructor(
    @InjectPinoLogger(AuditService.name)
    private readonly logger: PinoLogger,
  ) {}

  /**
   * Log a success message
   */
  success(
    message: string,
    context?: string,
    metadata?: Record<string, unknown>,
  ): void {
    this.logger.info(
      { context, ...metadata, level: 'success' },
      `✓ ${message}`,
    );
  }

  /**
   * Log an info message
   */
  info(
    message: string,
    context?: string,
    metadata?: Record<string, unknown>,
  ): void {
    this.logger.info({ context, ...metadata }, `ℹ ${message}`);
  }

  /**
   * Log a warning message
   */
  warn(
    message: string,
    context?: string,
    metadata?: Record<string, unknown>,
  ): void {
    this.logger.warn({ context, ...metadata }, `⚠ ${message}`);
  }

  /**
   * Log an error message
   */
  error(
    message: string,
    context?: string,
    metadata?: Record<string, unknown>,
  ): void {
    this.logger.error({ context, ...metadata }, `✗ ${message}`);
  }

  /**
   * Log a debug message
   */
  debug(
    message: string,
    context?: string,
    metadata?: Record<string, unknown>,
  ): void {
    this.logger.debug({ context, ...metadata }, `🔍 ${message}`);
  }

  /**
   * Log HTTP request/response
   */
  logRequest(ctx: RequestContext): void {
    const { method, url, statusCode, duration, userId } = ctx;
    const userInfo = userId ? ` [User: ${userId}]` : '';
    const message = `${method} ${url} - ${statusCode} (${duration}ms)${userInfo}`;

    if (statusCode >= 500) {
      this.logger.error({ context: 'HTTP', ...ctx }, message);
    } else if (statusCode >= 400) {
      this.logger.warn({ context: 'HTTP', ...ctx }, message);
    } else {
      this.logger.info({ context: 'HTTP', ...ctx }, message);
    }
  }

  /**
   * Persist audit log entry to database (placeholder for Supabase integration)
   */
  persistLog(entry: AuditLogEntry): void {
    this.logger.debug(
      { context: 'AuditService', entry },
      'Audit log queued for persistence',
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
