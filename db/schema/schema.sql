-- Complete Database Schema for Reminder System
-- This file contains the complete schema after all migrations
-- Extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "postgis";
-- Helper function for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW();
RETURN NEW;
END;
$$ LANGUAGE plpgsql;
-- ============================================
-- CORE TABLES: Users and Teams
-- ============================================
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL UNIQUE,
  user_name VARCHAR(100) NOT NULL,
  profile_picture_url VARCHAR(500),
  language VARCHAR(10) DEFAULT 'en',
  timezone VARCHAR(50) DEFAULT 'Asia/Kolkata',
  user_role VARCHAR(20) DEFAULT 'individual',
  phone_number VARCHAR(15),
  notifications_enabled BOOLEAN DEFAULT true,
  push_notifications BOOLEAN DEFAULT true,
  email_notifications BOOLEAN DEFAULT false,
  sms_notifications BOOLEAN DEFAULT false,
  theme VARCHAR(20) DEFAULT 'light',
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  deleted_at TIMESTAMP
);
CREATE TRIGGER update_users_updated_at BEFORE
UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TABLE teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  manager_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  team_name VARCHAR(255) NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);
CREATE INDEX idx_teams_manager_id ON teams(manager_id);
CREATE TRIGGER update_teams_updated_at BEFORE
UPDATE ON teams FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TABLE team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(20) DEFAULT 'member',
  joined_at TIMESTAMP DEFAULT now(),
  UNIQUE(team_id, user_id)
);
CREATE INDEX idx_team_members_team_id ON team_members(team_id);
CREATE INDEX idx_team_members_user_id ON team_members(user_id);
-- ============================================
-- REMINDERS AND PATTERNS
-- ============================================
CREATE TABLE reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(500) NOT NULL,
  description TEXT,
  category VARCHAR(20) NOT NULL,
  priority VARCHAR(10) DEFAULT 'medium',
  initial_deadline TIMESTAMP,
  suggested_time TIMESTAMP,
  accepted_time TIMESTAMP,
  completed_at TIMESTAMP,
  completion_status VARCHAR(20) DEFAULT 'pending',
  accepted_suggestion BOOLEAN DEFAULT false,
  is_recurring BOOLEAN DEFAULT false,
  recurrence_pattern VARCHAR(50),
  recurrence_end_date TIMESTAMP,
  is_team_reminder BOOLEAN DEFAULT false,
  team_id UUID REFERENCES teams(id),
  assigned_to_users UUID [] DEFAULT ARRAY []::UUID [],
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  CONSTRAINT reminder_has_deadline CHECK (
    initial_deadline IS NOT NULL
    OR accepted_time IS NOT NULL
  )
);
CREATE INDEX idx_reminders_user_id ON reminders(user_id);
CREATE INDEX idx_reminders_team_id ON reminders(team_id);
CREATE INDEX idx_reminders_completion_status ON reminders(completion_status);
CREATE TRIGGER update_reminders_updated_at BEFORE
UPDATE ON reminders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TABLE user_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  hour_of_day INTEGER NOT NULL CHECK (
    hour_of_day >= 0
    AND hour_of_day < 24
  ),
  day_of_week VARCHAR(10) NOT NULL,
  category VARCHAR(20) NOT NULL,
  completion_rate DECIMAL(3, 2) DEFAULT 0.0,
  total_reminders INTEGER DEFAULT 0,
  completed_reminders INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  UNIQUE(user_id, hour_of_day, day_of_week, category)
);
CREATE INDEX idx_user_patterns_user_id ON user_patterns(user_id);
CREATE TRIGGER update_user_patterns_updated_at BEFORE
UPDATE ON user_patterns FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
-- ============================================
-- AI AND SUGGESTIONS
-- ============================================
CREATE TABLE ai_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reminder_id UUID NOT NULL REFERENCES reminders(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  suggested_time TIMESTAMP NOT NULL,
  reasoning_text TEXT NOT NULL,
  confidence_score DECIMAL(3, 2) NOT NULL,
  accepted BOOLEAN DEFAULT false,
  user_override_time TIMESTAMP,
  created_at TIMESTAMP DEFAULT now(),
  UNIQUE(reminder_id, suggested_time)
);
CREATE INDEX idx_ai_suggestions_reminder_id ON ai_suggestions(reminder_id);
CREATE INDEX idx_ai_suggestions_user_id ON ai_suggestions(user_id);
CREATE TABLE suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  suggestion_type VARCHAR(50) NOT NULL,
  content TEXT NOT NULL,
  reasoning TEXT,
  confidence_score DECIMAL(3, 2) NOT NULL,
  accepted BOOLEAN DEFAULT false,
  dismissed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT now(),
  expires_at TIMESTAMP
);
CREATE INDEX idx_suggestions_user_id ON suggestions(user_id);
-- ============================================
-- GEOLOCATION
-- ============================================
CREATE TABLE geo_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reminder_id UUID NOT NULL REFERENCES reminders(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  location_name VARCHAR(255) NOT NULL,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  radius_meters INTEGER NOT NULL,
  is_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);
CREATE INDEX idx_geo_reminders_user_id ON geo_reminders(user_id);
CREATE INDEX idx_geo_reminders_reminder_id ON geo_reminders(reminder_id);
CREATE TRIGGER update_geo_reminders_updated_at BEFORE
UPDATE ON geo_reminders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TABLE geo_triggers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  geo_reminder_id UUID NOT NULL REFERENCES geo_reminders(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  triggered_at TIMESTAMP NOT NULL,
  notification_sent BOOLEAN DEFAULT false,
  notification_sent_at TIMESTAMP,
  user_interaction VARCHAR(20),
  interaction_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT now()
);
CREATE INDEX idx_geo_triggers_geo_reminder_id ON geo_triggers(geo_reminder_id);
CREATE INDEX idx_geo_triggers_user_id ON geo_triggers(user_id);
-- ============================================
-- VOICE AND NOTIFICATIONS
-- ============================================
CREATE TABLE voice_commands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  audio_url VARCHAR(500),
  transcript TEXT NOT NULL,
  extracted_intent JSONB NOT NULL,
  confidence_score DECIMAL(3, 2) NOT NULL,
  created_reminder_id UUID REFERENCES reminders(id),
  status VARCHAR(20) DEFAULT 'pending',
  error_message TEXT,
  created_at TIMESTAMP DEFAULT now()
);
CREATE INDEX idx_voice_commands_user_id ON voice_commands(user_id);
CREATE TABLE escalations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reminder_id UUID NOT NULL REFERENCES reminders(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  escalation_level INTEGER NOT NULL,
  triggered_at TIMESTAMP NOT NULL,
  manager_notified BOOLEAN DEFAULT false,
  manager_notification_sent_at TIMESTAMP,
  suggested_action TEXT,
  action_taken VARCHAR(50),
  action_taken_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT now()
);
CREATE INDEX idx_escalations_reminder_id ON escalations(reminder_id);
CREATE INDEX idx_escalations_user_id ON escalations(user_id);
CREATE TABLE follow_ups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reminder_id UUID NOT NULL REFERENCES reminders(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  follow_up_number INTEGER NOT NULL,
  sent_at TIMESTAMP NOT NULL,
  notification_type VARCHAR(20),
  follow_up_text TEXT,
  user_response VARCHAR(20),
  user_response_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT now()
);
CREATE INDEX idx_follow_ups_reminder_id ON follow_ups(reminder_id);
CREATE INDEX idx_follow_ups_user_id ON follow_ups(user_id);
CREATE TABLE notification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reminder_id UUID REFERENCES reminders(id),
  notification_type VARCHAR(20) NOT NULL,
  title VARCHAR(500),
  body TEXT,
  fcm_token VARCHAR(500),
  sent_at TIMESTAMP NOT NULL,
  delivery_status VARCHAR(20) DEFAULT 'pending',
  error_message TEXT,
  created_at TIMESTAMP DEFAULT now()
);
CREATE INDEX idx_notification_logs_user_id ON notification_logs(user_id);
CREATE INDEX idx_notification_logs_reminder_id ON notification_logs(reminder_id);
-- ============================================
-- STATISTICS
-- ============================================
CREATE TABLE user_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  total_reminders INTEGER DEFAULT 0,
  completed_reminders INTEGER DEFAULT 0,
  completion_rate DECIMAL(3, 2) DEFAULT 0,
  accepted_suggestions INTEGER DEFAULT 0,
  total_suggestions INTEGER DEFAULT 0,
  current_streak_days INTEGER DEFAULT 0,
  longest_streak_days INTEGER DEFAULT 0,
  points_earned INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);
CREATE INDEX idx_user_stats_user_id ON user_stats(user_id);
CREATE TRIGGER update_user_stats_updated_at BEFORE
UPDATE ON user_stats FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TABLE team_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL UNIQUE REFERENCES teams(id) ON DELETE CASCADE,
  manager_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  total_team_reminders INTEGER DEFAULT 0,
  completed_team_reminders INTEGER DEFAULT 0,
  avg_completion_rate DECIMAL(3, 2) DEFAULT 0,
  completion_rate_trend VARCHAR(10) DEFAULT 'stable',
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);
CREATE INDEX idx_team_stats_team_id ON team_stats(team_id);
CREATE TRIGGER update_team_stats_updated_at BEFORE
UPDATE ON team_stats FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();