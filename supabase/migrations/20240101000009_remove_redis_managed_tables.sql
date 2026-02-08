-- Migration: Remove database tables now managed by Redis
-- Run this AFTER switching to Redis-only token/OTP management
-- Drop refresh_tokens table (tokens now in Redis)
DROP TABLE IF EXISTS refresh_tokens CASCADE;
-- Drop verification_codes table (OTPs now in Redis)
DROP TABLE IF EXISTS verification_codes CASCADE;
-- Note: The following tables are still in use:
-- - users (user data)
-- - audit_logs (persistent audit trail)