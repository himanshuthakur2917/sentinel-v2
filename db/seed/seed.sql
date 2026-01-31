-- Seed Data for Development and Testing
-- Create sample users
INSERT INTO users (
    id,
    email,
    user_name,
    language,
    timezone,
    user_role,
    phone_number
  )
VALUES (
    '550e8400-e29b-41d4-a716-446655440001',
    'john.doe@example.com',
    'John Doe',
    'en',
    'Asia/Kolkata',
    'individual',
    '+919876543210'
  ),
  (
    '550e8400-e29b-41d4-a716-446655440002',
    'jane.manager@example.com',
    'Jane Manager',
    'en',
    'Asia/Kolkata',
    'team_manager',
    '+919876543211'
  ),
  (
    '550e8400-e29b-41d4-a716-446655440003',
    'alice.kumar@example.com',
    'Alice Kumar',
    'hi',
    'Asia/Kolkata',
    'individual',
    '+919876543212'
  );
-- Create sample teams
INSERT INTO teams (id, manager_id, team_name, description)
VALUES (
    '650e8400-e29b-41d4-a716-446655440001',
    '550e8400-e29b-41d4-a716-446655440002',
    'Product Team',
    'Main product development team'
  );
-- Add team members
INSERT INTO team_members (team_id, user_id, role)
VALUES (
    '650e8400-e29b-41d4-a716-446655440001',
    '550e8400-e29b-41d4-a716-446655440001',
    'member'
  ),
  (
    '650e8400-e29b-41d4-a716-446655440001',
    '550e8400-e29b-41d4-a716-446655440003',
    'member'
  );
-- Create sample reminders
INSERT INTO reminders (
    user_id,
    title,
    description,
    category,
    priority,
    initial_deadline,
    completion_status
  )
VALUES (
    '550e8400-e29b-41d4-a716-446655440001',
    'Call client for project update',
    'Follow up on Q1 deliverables',
    'work',
    'high',
    now() + interval '2 hours',
    'pending'
  ),
  (
    '550e8400-e29b-41d4-a716-446655440001',
    'Morning workout',
    '30 minutes cardio',
    'health',
    'medium',
    now() + interval '1 day',
    'pending'
  ),
  (
    '550e8400-e29b-41d4-a716-446655440003',
    'Buy groceries',
    'Get vegetables and fruits',
    'personal',
    'low',
    now() + interval '3 hours',
    'pending'
  );
-- Initialize user stats
INSERT INTO user_stats (
    user_id,
    total_reminders,
    completed_reminders,
    completion_rate,
    current_streak_days,
    points_earned
  )
VALUES (
    '550e8400-e29b-41d4-a716-446655440001',
    10,
    8,
    0.80,
    3,
    240
  ),
  (
    '550e8400-e29b-41d4-a716-446655440002',
    5,
    5,
    1.00,
    7,
    150
  ),
  (
    '550e8400-e29b-41d4-a716-446655440003',
    7,
    5,
    0.71,
    2,
    150
  );
-- Create sample user patterns
INSERT INTO user_patterns (
    user_id,
    hour_of_day,
    day_of_week,
    category,
    completion_rate,
    total_reminders,
    completed_reminders
  )
VALUES (
    '550e8400-e29b-41d4-a716-446655440001',
    10,
    'monday',
    'work',
    0.85,
    20,
    17
  ),
  (
    '550e8400-e29b-41d4-a716-446655440001',
    18,
    'friday',
    'personal',
    0.60,
    10,
    6
  ),
  (
    '550e8400-e29b-41d4-a716-446655440003',
    7,
    'tuesday',
    'health',
    0.90,
    10,
    9
  );
-- Note: Add more seed data as needed for testing specific features