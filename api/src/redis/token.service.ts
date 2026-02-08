import { Injectable, Inject } from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS_CLIENT } from './redis.module';
import { AuditService } from '../audit';

@Injectable()
export class TokenService {
  private isRedisAvailable = false;

  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    private readonly auditService: AuditService,
  ) {
    this.checkRedisConnection()
      .then(() => {
        this.auditService.info('Redis connection checked', 'TokenService');
      })
      .catch(() => {
        this.auditService.error(
          'Redis connection check failed',
          'TokenService',
        );
      });
  }

  private async checkRedisConnection() {
    try {
      await this.redis.ping();
      this.isRedisAvailable = true;
    } catch {
      this.isRedisAvailable = false;
    }
  }

  /**
   * Store a refresh token with TTL
   */
  async storeRefreshToken(
    userId: string,
    tokenId: string,
    ttlSeconds: number,
  ): Promise<void> {
    if (!this.isRedisAvailable) return;

    const key = `refresh:${userId}:${tokenId}`;
    await this.redis.setex(key, ttlSeconds, '1');
    this.auditService.debug(`Stored refresh token ${tokenId}`, 'TokenService');
  }

  /**
   * Check if a refresh token exists and is valid
   */
  async isRefreshTokenValid(userId: string, tokenId: string): Promise<boolean> {
    if (!this.isRedisAvailable) return true; // Fallback to database check

    const key = `refresh:${userId}:${tokenId}`;
    const exists = await this.redis.exists(key);
    return exists === 1;
  }

  /**
   * Revoke a specific refresh token
   */
  async revokeRefreshToken(userId: string, tokenId: string): Promise<void> {
    if (!this.isRedisAvailable) return;

    const key = `refresh:${userId}:${tokenId}`;
    await this.redis.del(key);
    this.auditService.debug(`Revoked refresh token ${tokenId}`, 'TokenService');
  }

  /**
   * Revoke all refresh tokens for a user
   */
  async revokeAllUserTokens(userId: string): Promise<void> {
    if (!this.isRedisAvailable) return;

    const pattern = `refresh:${userId}:*`;
    const keys = await this.redis.keys(pattern);
    if (keys.length > 0) {
      await this.redis.del(...keys);
      this.auditService.info(
        `Revoked ${keys.length} tokens for user ${userId}`,
        'TokenService',
      );
    }
  }

  /**
   * Blacklist an access token (for immediate invalidation)
   */
  async blacklistAccessToken(
    tokenId: string,
    ttlSeconds: number,
  ): Promise<void> {
    if (!this.isRedisAvailable) return;

    const key = `blacklist:${tokenId}`;
    await this.redis.setex(key, ttlSeconds, '1');
    this.auditService.debug(
      `Blacklisted access token ${tokenId}`,
      'TokenService',
    );
  }

  /**
   * Check if an access token is blacklisted
   */
  async isAccessTokenBlacklisted(tokenId: string): Promise<boolean> {
    if (!this.isRedisAvailable) return false;

    const key = `blacklist:${tokenId}`;
    const exists = await this.redis.exists(key);
    return exists === 1;
  }

  /**
   * Store OTP with TTL
   */
  async storeOtp(
    sessionToken: string,
    identifier: string,
    type: 'email' | 'phone',
    code: string,
    ttlSeconds: number,
  ): Promise<void> {
    if (!this.isRedisAvailable) return;

    const key = `otp:${sessionToken}:${type}`;
    await this.redis.setex(
      key,
      ttlSeconds,
      JSON.stringify({ identifier, code, attempts: 0, verified: false }),
    );
  }

  /**
   * Get OTP data
   */
  async getOtp(
    sessionToken: string,
    type: 'email' | 'phone',
  ): Promise<{
    identifier: string;
    code: string;
    attempts: number;
    verified: boolean;
  } | null> {
    if (!this.isRedisAvailable) return null;

    const key = `otp:${sessionToken}:${type}`;
    const data = await this.redis.get(key);
    return data ? JSON.parse(data) : null;
  }

  /**
   * Increment OTP attempts
   */
  async incrementOtpAttempts(
    sessionToken: string,
    type: 'email' | 'phone',
  ): Promise<number> {
    if (!this.isRedisAvailable) return 0;

    const key = `otp:${sessionToken}:${type}`;
    const data = await this.getOtp(sessionToken, type);
    if (!data) return 0;

    data.attempts += 1;
    const ttl = await this.redis.ttl(key);
    if (ttl > 0) {
      await this.redis.setex(key, ttl, JSON.stringify(data));
    }
    return data.attempts;
  }

  /**
   * Mark OTP as verified
   */
  async markOtpVerified(
    sessionToken: string,
    type: 'email' | 'phone',
  ): Promise<void> {
    if (!this.isRedisAvailable) return;

    const key = `otp:${sessionToken}:${type}`;
    const data = await this.getOtp(sessionToken, type);
    if (!data) return;

    data.verified = true;
    const ttl = await this.redis.ttl(key);
    if (ttl > 0) {
      await this.redis.setex(key, ttl, JSON.stringify(data));
    }
  }

  /**
   * Check if session is fully verified (both email and phone)
   */
  async isSessionFullyVerified(sessionToken: string): Promise<{
    email: { identifier: string; verified: boolean } | null;
    phone: { identifier: string; verified: boolean } | null;
  }> {
    const email = await this.getOtp(sessionToken, 'email');
    const phone = await this.getOtp(sessionToken, 'phone');

    return {
      email: email
        ? { identifier: email.identifier, verified: email.verified }
        : null,
      phone: phone
        ? { identifier: phone.identifier, verified: phone.verified }
        : null,
    };
  }

  /**
   * Delete OTP session
   */
  async deleteOtpSession(sessionToken: string): Promise<void> {
    if (!this.isRedisAvailable) return;

    await this.redis.del(
      `otp:${sessionToken}:email`,
      `otp:${sessionToken}:phone`,
    );
  }
}
