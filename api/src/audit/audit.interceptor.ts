import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request, Response } from 'express';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { AuditService } from './audit.service';
import {
  AUDIT_LOG_KEY,
  AuditLogConfig,
} from './decorators/audit-log.decorator';
import { RequestContext } from './interfaces/audit-log.interface';

/**
 * Extended Request interface with user property
 */
interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    [key: string]: unknown;
  };
}

/**
 * Error interface for HTTP exceptions
 */
interface HttpError extends Error {
  status?: number;
  stack?: string;
}

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    private readonly auditService: AuditService,
    private readonly reflector: Reflector,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const startTime = Date.now();
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const response = context.switchToHttp().getResponse<Response>();

    // Get audit log configuration from decorator (if present)
    const auditConfig = this.reflector.get<AuditLogConfig>(
      AUDIT_LOG_KEY,
      context.getHandler(),
    );

    return next.handle().pipe(
      tap(() => {
        const duration = Date.now() - startTime;
        const requestContext = this.buildRequestContext(
          request,
          response.statusCode,
          duration,
        );

        // Log HTTP request
        this.auditService.logRequest(requestContext);

        // If audit decorator is present, handle custom audit logging
        if (auditConfig) {
          this.handleAuditLog(auditConfig, requestContext, 'success');
        }
      }),
      catchError((error: HttpError) => {
        const duration = Date.now() - startTime;
        const statusCode = error.status || 500;
        const requestContext = this.buildRequestContext(
          request,
          statusCode,
          duration,
        );

        // Log HTTP error
        this.auditService.logRequest(requestContext);
        this.auditService.error(
          `${error.message || 'Unknown error'}`,
          'Exception',
          { stack: error.stack },
        );

        // If audit decorator is present, handle custom audit logging
        if (auditConfig) {
          this.handleAuditLog(auditConfig, requestContext, 'error');
        }

        throw error;
      }),
    );
  }

  /**
   * Build request context from incoming request
   */
  private buildRequestContext(
    request: AuthenticatedRequest,
    statusCode: number,
    duration: number,
  ): RequestContext {
    return {
      method: request.method,
      url: request.url,
      statusCode,
      duration,
      userId: request.user?.id,
      ipAddress: this.getClientIp(request),
      userAgent: request.headers['user-agent'],
      body: this.sanitizeBody(request.body as Record<string, unknown>),
      query: request.query as Record<string, unknown>,
      params: request.params as Record<string, unknown>,
    };
  }

  /**
   * Handle audit log persistence based on decorator configuration
   */
  private handleAuditLog(
    config: AuditLogConfig,
    ctx: RequestContext,
    status: 'success' | 'failure' | 'error',
  ): void {
    const { action, resource, persist } = config;

    // Log to console
    const level = status === 'success' ? 'success' : 'error';
    this.auditService[level](`${action} on ${resource || 'unknown'}`, 'Audit', {
      userId: ctx.userId,
      duration: `${ctx.duration}ms`,
    });

    // Persist to database if configured
    if (persist) {
      this.auditService.persistLog({
        userId: ctx.userId,
        action,
        resource,
        resourceId: ctx.params?.id as string,
        metadata: { body: ctx.body, query: ctx.query },
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
        status,
        duration: ctx.duration,
      });
    }
  }

  /**
   * Extract client IP address from request
   */
  private getClientIp(request: AuthenticatedRequest): string {
    const forwarded = request.headers['x-forwarded-for'];
    if (typeof forwarded === 'string') {
      return forwarded.split(',')[0].trim();
    }
    return request.ip || 'unknown';
  }

  /**
   * Sanitize request body to remove sensitive fields
   */
  private sanitizeBody(body: Record<string, unknown>): Record<string, unknown> {
    if (!body) return {};

    const sensitiveFields = [
      'password',
      'token',
      'secret',
      'otp',
      'code',
      'refreshToken',
    ];
    const sanitized = { ...body };

    for (const field of sensitiveFields) {
      if (field in sanitized) {
        sanitized[field] = '[REDACTED]';
      }
    }

    return sanitized;
  }
}
