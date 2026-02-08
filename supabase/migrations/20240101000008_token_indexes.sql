-- Migration: Add token_id column to refresh_tokens for Redis tracking
-- Run this AFTER 20240101000007_auth_tables.sql
-- Add id as primary key if not already UUID
-- (The original migration already has id as UUID PRIMARY KEY, but we need to ensure it can be set explicitly)
-- Ensure the refresh_tokens table uses the id column for token tracking
-- No structural changes needed if id is already the primary key
-- Add index for faster lookups by user_id and revoked status
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_revoked ON refresh_tokens(user_id, revoked)
WHERE revoked = false;
-- Add index for token expiry cleanup
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires_at ON refresh_tokens(expires_at)
WHERE revoked = false;
-- Add cleanup function for expired tokens (can be run periodically)
CREATE OR REPLACE FUNCTION cleanup_expired_tokens() RETURNS void AS $$ BEGIN
DELETE FROM refresh_tokens
WHERE expires_at < NOW()
  OR revoked = true;
DELETE FROM verification_codes
WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;
-- Optional: Create a cron job to run cleanup (requires pg_cron extension)
-- SELECT cron.schedule('cleanup-tokens', '0 * * * *', 'SELECT cleanup_expired_tokens()');
COMMENT ON FUNCTION cleanup_expired_tokens IS 'Removes expired and revoked tokens. Run periodically via cron or scheduled task.';