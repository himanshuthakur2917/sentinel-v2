import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import type { Request } from 'express';

/**
 * CSRF Guard
 * Validates CSRF token using double-submit cookie pattern
 * Apply to state-changing endpoints (POST/PUT/DELETE)
 */
@Injectable()
export class CsrfGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();

    // Skip CSRF check for GET/HEAD/OPTIONS
    if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
      return true;
    }

    const tokenFromHeader = request.headers['x-csrf-token'] as string;
    const tokenFromCookie = request.cookies['csrfToken'];

    // Both must exist and match (double-submit pattern)
    if (
      !tokenFromHeader ||
      !tokenFromCookie ||
      tokenFromHeader !== tokenFromCookie
    ) {
      throw new ForbiddenException('Invalid CSRF token');
    }

    return true;
  }
}
