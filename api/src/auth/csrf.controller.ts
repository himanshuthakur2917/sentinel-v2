import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  Res,
  Req,
} from '@nestjs/common';
import type { Response, Request } from 'express';
import { randomBytes } from 'crypto';

/**
 * CSRF Token Controller
 * Provides CSRF token for protecting state-changing operations
 */
@Controller('auth')
export class CsrfController {
  /**
   * Generate a CSRF token
   * Stores token in httpOnly cookie and returns it in response
   * Uses double-submit cookie pattern for CSRF protection
   */
  @Get('csrf')
  @HttpCode(HttpStatus.OK)
  getCsrfToken(@Res({ passthrough: true }) res: Response): {
    csrfToken: string;
  } {
    // Generate random CSRF token
    const csrfToken = randomBytes(32).toString('hex');

    // Set CSRF token in a cookie (non-httpOnly so client can read it)
    res.cookie('csrfToken', csrfToken, {
      httpOnly: false, // Client needs to read this to send in header
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    });

    // Also return in response body
    return { csrfToken };
  }

  /**
   * Middleware to validate CSRF token on state-changing requests
   * Should be used as guard on POST/PUT/DELETE endpoints
   */
  static validateCsrfToken(req: Request): boolean {
    const tokenFromHeader = req.headers['x-csrf-token'] as string;
    const tokenFromCookie = req.cookies['csrfToken'];

    // Both must exist and match (double-submit pattern)
    return (
      tokenFromHeader && tokenFromCookie && tokenFromHeader === tokenFromCookie
    );
  }
}
