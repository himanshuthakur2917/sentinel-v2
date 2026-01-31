# Database Migration Structure

This directory contains the complete database schema for the Reminder System, organized as versioned migrations.

## Structure

```
db/
├── migrations/           # Versioned database migrations
│   ├── 001_init/
│   ├── 002_create_users_and_teams/
│   ├── 003_create_reminders/
│   ├── 004_create_geo_reminders/
│   ├── 005_create_notifications_tracking/
│   └── 006_add_rls_policies/
├── schema/               # Complete schema file
│   └── schema.sql
└── seed/                 # Seed data for development
    └── seed.sql
```

## Migration Order

1. **001_init** - PostgreSQL extensions and helper functions
2. **002_create_users_and_teams** - User accounts and team management
3. **003_create_reminders** - Core reminder functionality with AI suggestions
4. **004_create_geo_reminders** - Location-based reminder triggers
5. **005_create_notifications_tracking** - Voice commands, escalations, follow-ups, notifications
6. **006_add_rls_policies** - Row-Level Security policies for data isolation

## Running Migrations with Supabase CLI

### Prerequisites
```bash
# Install Supabase CLI
npm install -g supabase

# Initialize Supabase in your project (if not already done)
supabase init

# Link to your remote project (optional)
supabase link --project-ref your-project-ref

# Start local Supabase (for development)
supabase start
```

### Option 1: Using Supabase Migrations (Recommended)

Copy migration files to Supabase migrations folder:
```bash
# Supabase expects migrations in supabase/migrations/
# Copy your migrations there with timestamp prefixes
cp db/migrations/001_init/up.sql supabase/migrations/20240101000001_init.sql
cp db/migrations/002_create_users_and_teams/up.sql supabase/migrations/20240101000002_create_users_and_teams.sql
cp db/migrations/003_create_reminders/up.sql supabase/migrations/20240101000003_create_reminders.sql
cp db/migrations/004_create_geo_reminders/up.sql supabase/migrations/20240101000004_create_geo_reminders.sql
cp db/migrations/005_create_notifications_tracking/up.sql supabase/migrations/20240101000005_create_notifications_tracking.sql
cp db/migrations/006_add_rls_policies/up.sql supabase/migrations/20240101000006_add_rls_policies.sql
```

Apply migrations:
```bash
# Apply to local database
supabase db reset

# Push to remote (production)
supabase db push
```

### Option 2: Direct SQL Execution

```bash
# Execute migration on local database
supabase db execute --file db/migrations/001_init/up.sql --local

# Execute on remote database
supabase db execute --file db/migrations/001_init/up.sql

# Apply complete schema (fresh local setup)
supabase db execute --file db/schema/schema.sql --local

# Apply seed data
supabase db execute --file db/seed/seed.sql --local
```

### Generate TypeScript Types
```bash
# Generate types from your database schema
supabase gen types typescript --local > api/src/types/supabase.ts
```

## Database Features

### Core Tables
- **users** - User accounts with preferences
- **teams** - Team management
- **team_members** - Team membership
- **reminders** - Core reminder functionality with recurrence support

### AI & Patterns
- **user_patterns** - Completion patterns by time/day/category
- **ai_suggestions** - AI-generated time suggestions
- **suggestions** - General user suggestions (recurring tasks, etc.)

### Geolocation
- **geo_reminders** - Location-based triggers
- **geo_triggers** - Geolocation trigger history

### Communication
- **voice_commands** - Voice input processing
- **notification_logs** - Notification delivery tracking
- **follow_ups** - Reminder follow-up tracking
- **escalations** - Overdue reminder escalation

### Analytics
- **user_stats** - User performance metrics
- **team_stats** - Team performance metrics

## Security

Row-Level Security (RLS) is enabled on all user-facing tables to ensure:
- Users can only access their own data
- Team managers can view their team members' data
- Proper data isolation in multi-tenant scenarios

## Notes

- All timestamps use PostgreSQL `TIMESTAMP` type
- UUIDs are generated using `gen_random_uuid()` from pgcrypto extension
- Automatic `updated_at` triggers are configured for mutable tables
- PostGIS extension is enabled for future geospatial features
