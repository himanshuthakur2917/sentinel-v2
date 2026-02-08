-- Migration 007: Authentication Tables
-- Creates tables for OTP verification, refresh tokens, and audit logs
-- Table: verification_codes (OTP storage for email + phone dual verification)
CREATE TABLE verification_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier VARCHAR(255) NOT NULL,
  identifier_type VARCHAR(10) NOT NULL CHECK (identifier_type IN ('email', 'phone')),
  code VARCHAR(6) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  verified BOOLEAN DEFAULT false,
  attempts INTEGER DEFAULT 0,
  session_token UUID NOT NULL,
  created_at TIMESTAMP DEFAULT now()
);
CREATE INDEX idx_verification_codes_session ON verification_codes(session_token);
CREATE INDEX idx_verification_codes_identifier ON verification_codes(identifier, identifier_type);
-- Table: refresh_tokens (JWT refresh token management)
CREATE TABLE refresh_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(255) NOT NULL UNIQUE,
  device_info TEXT,
  expires_at TIMESTAMP NOT NULL,
  revoked BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT now()
);
CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_token_hash ON refresh_tokens(token_hash);
-- Table: audit_logs (persistent server-side audit trail)
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  action VARCHAR(100) NOT NULL,
  resource VARCHAR(100),
  resource_id UUID,
  metadata JSONB,
  ip_address VARCHAR(45),
  user_agent TEXT,
  status VARCHAR(20) DEFAULT 'success' CHECK (status IN ('success', 'failure', 'error')),
  duration_ms INTEGER,
  created_at TIMESTAMP DEFAULT now()
);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
-- Add new columns to users table for enhanced auth
ALTER TABLE users
ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS user_type VARCHAR(30) DEFAULT 'individual' CHECK (
    user_type IN (
      'student',
      'working_professional',
      'team_manager'
    )
  ),
  ADD COLUMN IF NOT EXISTS country VARCHAR(100),
  ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP;
-- Make phone_number required and unique (update existing constraint)
ALTER TABLE users
ALTER COLUMN phone_number
SET NOT NULL,
  ADD CONSTRAINT users_phone_number_unique UNIQUE (phone_number);
-- Enable RLS on new tables
ALTER TABLE verification_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE refresh_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
-- RLS Policies for verification_codes (public access for verification flow)
CREATE POLICY "Anyone can create verification codes" ON verification_codes FOR
INSERT WITH CHECK (true);
CREATE POLICY "Anyone can verify codes with session token" ON verification_codes FOR
SELECT USING (true);
CREATE POLICY "Anyone can update verification status" ON verification_codes FOR
UPDATE USING (true);
-- RLS Policies for refresh_tokens
CREATE POLICY "Users can view their own refresh tokens" ON refresh_tokens FOR
SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can revoke their own tokens" ON refresh_tokens FOR
UPDATE USING (auth.uid() = user_id);
-- RLS Policies for audit_logs (admin/service role only)
CREATE POLICY "Service role can manage audit logs" ON audit_logs FOR ALL USING (auth.role() = 'service_role');
-- Cleanup function: Remove expired verification codes
CREATE OR REPLACE FUNCTION cleanup_expired_verification_codes() RETURNS void AS $$ BEGIN
DELETE FROM verification_codes
WHERE expires_at < now();
END;
$$ LANGUAGE plpgsql;