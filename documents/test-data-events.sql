-- ============================================================================
-- EVENTS BACKEND - SAMPLE TEST DATA
-- NFC Attendance System
-- 
-- INSTRUCTIONS:
-- 1. Make sure you have run setup-events.sql first
-- 2. Replace the placeholder UUIDs below with actual IDs from your database
-- 3. Run this script to populate test data
-- 
-- WARNING: This is for TESTING/DEVELOPMENT only!
-- Do NOT run this on production databases!
-- ============================================================================

-- ----------------------------------------------------------------------------
-- STEP 1: Get Your Organization and User IDs
-- ----------------------------------------------------------------------------

-- Run these queries first to get IDs to use below:

-- Get your organization IDs
SELECT id, name FROM organizations LIMIT 5;

-- Get your user IDs  
SELECT id, name, email FROM users LIMIT 5;

-- Get your user ID from auth
SELECT id FROM users WHERE auth_id = auth.uid();

-- ----------------------------------------------------------------------------
-- STEP 2: Replace Placeholders and Insert Test Events
-- ----------------------------------------------------------------------------

-- ⚠️ REPLACE THESE VALUES WITH ACTUAL IDs FROM YOUR DATABASE:
-- 'your-org-id-here' → Replace with actual organization ID
-- 'your-user-id-here' → Replace with actual user ID

-- Test Event 1: Upcoming team meeting
INSERT INTO events (event_name, date, organization_id, description, location, created_by)
VALUES (
  'Weekly Team Standup',
  NOW() + INTERVAL '2 days',
  'your-org-id-here',  -- ⚠️ REPLACE THIS
  'Weekly team sync to discuss progress and blockers',
  'Conference Room A',
  'your-user-id-here'  -- ⚠️ REPLACE THIS
);

-- Test Event 2: Workshop tomorrow
INSERT INTO events (event_name, date, organization_id, description, location, created_by)
VALUES (
  'React Workshop',
  NOW() + INTERVAL '1 day',
  'your-org-id-here',  -- ⚠️ REPLACE THIS
  'Hands-on workshop covering React hooks and best practices',
  'Lab 201',
  'your-user-id-here'  -- ⚠️ REPLACE THIS
);

-- Test Event 3: Event next week
INSERT INTO events (event_name, date, organization_id, description, location, created_by)
VALUES (
  'Tech Talk: AI in Web Development',
  NOW() + INTERVAL '7 days',
  'your-org-id-here',  -- ⚠️ REPLACE THIS
  'Learn about the latest AI tools and frameworks for modern web development',
  'Auditorium',
  'your-user-id-here'  -- ⚠️ REPLACE THIS
);

-- Test Event 4: Hackathon
INSERT INTO events (event_name, date, organization_id, description, location, created_by)
VALUES (
  '24-Hour Hackathon',
  NOW() + INTERVAL '14 days',
  'your-org-id-here',  -- ⚠️ REPLACE THIS
  'Build innovative solutions in 24 hours. Prizes for top 3 teams!',
  'Innovation Lab',
  'your-user-id-here'  -- ⚠️ REPLACE THIS
);

-- Test Event 5: Past event (for testing past events query)
INSERT INTO events (event_name, date, organization_id, description, location, created_by)
VALUES (
  'Previous Team Meeting',
  NOW() - INTERVAL '3 days',
  'your-org-id-here',  -- ⚠️ REPLACE THIS
  'Last week team meeting',
  'Conference Room B',
  'your-user-id-here'  -- ⚠️ REPLACE THIS
);

-- Test Event 6: Event without optional fields
INSERT INTO events (event_name, date, organization_id, created_by)
VALUES (
  'Quick Sync',
  NOW() + INTERVAL '5 days',
  'your-org-id-here',  -- ⚠️ REPLACE THIS
  'your-user-id-here'  -- ⚠️ REPLACE THIS
);

-- Test Event 7: Far future event
INSERT INTO events (event_name, date, organization_id, description, location, created_by)
VALUES (
  'Annual Tech Conference 2026',
  '2026-06-15 09:00:00+00',
  'your-org-id-here',  -- ⚠️ REPLACE THIS
  'Our biggest annual event with speakers from around the world',
  'Convention Center',
  'your-user-id-here'  -- ⚠️ REPLACE THIS
);

-- ----------------------------------------------------------------------------
-- STEP 3: Verify Test Data
-- ----------------------------------------------------------------------------

-- Count total events
SELECT 
  'Total events created: ' || COUNT(*) as result
FROM events;

-- View all events ordered by date
SELECT 
  event_name,
  date,
  location,
  CASE 
    WHEN date > NOW() THEN '🔮 Upcoming'
    ELSE '📅 Past'
  END as status
FROM events
ORDER BY date ASC;

-- View upcoming events only
SELECT 
  event_name,
  date,
  location,
  description
FROM events
WHERE date >= NOW()
ORDER BY date ASC;

-- View events with organization names
SELECT 
  e.event_name,
  e.date,
  e.location,
  o.name as organization_name,
  u.name as created_by_name
FROM events e
JOIN organizations o ON e.organization_id = o.id
JOIN users u ON e.created_by = u.id
ORDER BY e.date ASC;

-- Count events by organization
SELECT 
  o.name as organization,
  COUNT(e.id) as event_count
FROM organizations o
LEFT JOIN events e ON o.id = e.organization_id
GROUP BY o.id, o.name
ORDER BY event_count DESC;

-- ============================================================================
-- TEST DATA INSERTED SUCCESSFULLY!
-- 
-- Next Steps:
-- 1. Test the API endpoints:
--    GET /api/event - Should return all events
--    GET /api/event?upcoming=true - Should return upcoming events
--    GET /api/event?past=true - Should return past events
--
-- 2. Test filtering:
--    GET /api/event?search=meeting
--    GET /api/event?organization_id=your-org-id
--
-- 3. Test CRUD operations:
--    POST /api/event - Create new event
--    PUT /api/event/[id] - Update event
--    DELETE /api/event/[id] - Delete event
--
-- See EVENTS_API_REFERENCE.md for complete API documentation
-- ============================================================================
