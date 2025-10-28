-- ============================================================================
-- EVENTS BACKEND SETUP - COMPLETE SCRIPT
-- NFC Attendance System
-- 
-- INSTRUCTIONS:
-- 1. Open Supabase SQL Editor
-- 2. Copy this entire file
-- 3. Paste and run in SQL Editor
-- 4. Check verification results at the end
--
-- PREREQUISITES:
-- - users table must exist
-- - organizations table must exist  
-- - organization_members table must exist
--
-- This script will create:
-- - events table
-- - 6 performance indexes
-- - 4 RLS policies (role-based access control)
-- - Automatic timestamp trigger
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. CREATE EVENTS TABLE
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_name TEXT NOT NULL,
  date TIMESTAMPTZ NOT NULL,
  organization_id UUID NOT NULL,
  description TEXT,
  location TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Foreign key to organizations table
  CONSTRAINT fk_organization
    FOREIGN KEY (organization_id)
    REFERENCES organizations(id)
    ON DELETE CASCADE,
  
  -- Foreign key to users table (creator)
  CONSTRAINT fk_created_by_user
    FOREIGN KEY (created_by)
    REFERENCES users(id)
    ON DELETE CASCADE
);

-- Add table and column comments
COMMENT ON TABLE events IS 'Stores events/activities hosted by organizations';
COMMENT ON COLUMN events.id IS 'Unique identifier for the event';
COMMENT ON COLUMN events.event_name IS 'Name of the event';
COMMENT ON COLUMN events.date IS 'Date and time when the event takes place';
COMMENT ON COLUMN events.organization_id IS 'Organization hosting the event';
COMMENT ON COLUMN events.description IS 'Optional description of the event';
COMMENT ON COLUMN events.location IS 'Optional location where event takes place';
COMMENT ON COLUMN events.created_by IS 'User who created the event';
COMMENT ON COLUMN events.created_at IS 'Timestamp when event was created';
COMMENT ON COLUMN events.updated_at IS 'Timestamp when event was last updated';

-- ----------------------------------------------------------------------------
-- 2. CREATE INDEXES FOR PERFORMANCE
-- ----------------------------------------------------------------------------

-- Index for organization lookups
CREATE INDEX IF NOT EXISTS idx_events_organization_id 
ON events(organization_id);

-- Index for date filtering and sorting
CREATE INDEX IF NOT EXISTS idx_events_date 
ON events(date DESC);

-- Index for creator lookups
CREATE INDEX IF NOT EXISTS idx_events_created_by 
ON events(created_by);

-- Index for created_at sorting
CREATE INDEX IF NOT EXISTS idx_events_created_at 
ON events(created_at DESC);

-- Index for event name searches
CREATE INDEX IF NOT EXISTS idx_events_name 
ON events(event_name);

-- Composite index for common queries (org + date)
CREATE INDEX IF NOT EXISTS idx_events_org_date 
ON events(organization_id, date DESC);

-- ----------------------------------------------------------------------------
-- 3. ENABLE ROW LEVEL SECURITY
-- ----------------------------------------------------------------------------

ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- 4. CREATE RLS POLICIES
-- ----------------------------------------------------------------------------

-- Policy: Members can view events in their organizations
DROP POLICY IF EXISTS "Members can view organization events" ON events;
CREATE POLICY "Members can view organization events"
  ON events
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      INNER JOIN users u ON om.user_id = u.id
      WHERE om.organization_id = events.organization_id
      AND u.auth_id = auth.uid()
    )
  );

-- Policy: Only Owners, Admins, and Attendance Takers can create events
DROP POLICY IF EXISTS "Authorized members can create events" ON events;
CREATE POLICY "Authorized members can create events"
  ON events
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_members om
      INNER JOIN users u ON om.user_id = u.id
      WHERE om.organization_id = events.organization_id
      AND u.auth_id = auth.uid()
      AND om.role IN ('Owner', 'Admin', 'Attendance Taker')
    )
    AND created_by IN (
      SELECT id FROM users WHERE auth_id = auth.uid()
    )
  );

-- Policy: Only Owners, Admins, and Attendance Takers can update events
DROP POLICY IF EXISTS "Authorized members can update events" ON events;
CREATE POLICY "Authorized members can update events"
  ON events
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      INNER JOIN users u ON om.user_id = u.id
      WHERE om.organization_id = events.organization_id
      AND u.auth_id = auth.uid()
      AND om.role IN ('Owner', 'Admin', 'Attendance Taker')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_members om
      INNER JOIN users u ON om.user_id = u.id
      WHERE om.organization_id = events.organization_id
      AND u.auth_id = auth.uid()
      AND om.role IN ('Owner', 'Admin', 'Attendance Taker')
    )
  );

-- Policy: Only Owners and Admins can delete events
DROP POLICY IF EXISTS "Owners and Admins can delete events" ON events;
CREATE POLICY "Owners and Admins can delete events"
  ON events
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      INNER JOIN users u ON om.user_id = u.id
      WHERE om.organization_id = events.organization_id
      AND u.auth_id = auth.uid()
      AND om.role IN ('Owner', 'Admin')
    )
  );

-- ----------------------------------------------------------------------------
-- 5. CREATE TRIGGER FOR AUTOMATIC UPDATED_AT
-- ----------------------------------------------------------------------------

-- Create or replace function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for events table
DROP TRIGGER IF EXISTS update_events_updated_at ON events;
CREATE TRIGGER update_events_updated_at
  BEFORE UPDATE ON events
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ----------------------------------------------------------------------------
-- 6. GRANT PERMISSIONS
-- ----------------------------------------------------------------------------

-- Grant necessary permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON events TO authenticated;

-- ============================================================================
-- SETUP COMPLETE! - VERIFICATION QUERIES BELOW
-- ============================================================================

-- Verify table created
SELECT 
  'Events table created successfully!' as status,
  COUNT(*) as current_event_count
FROM events;

-- Verify RLS enabled
SELECT 
  'RLS Status: ' || CASE WHEN rowsecurity THEN 'ENABLED ✓' ELSE 'DISABLED ✗' END as rls_status
FROM pg_tables 
WHERE tablename = 'events';

-- Count policies
SELECT 
  'Total RLS Policies: ' || COUNT(*) as policy_count
FROM pg_policies 
WHERE tablename = 'events';

-- List all policies
SELECT 
  'Policy: ' || policyname as policy_name,
  cmd as operation
FROM pg_policies 
WHERE tablename = 'events'
ORDER BY cmd;

-- Count indexes
SELECT 
  'Total Indexes: ' || COUNT(*) as index_count
FROM pg_indexes 
WHERE tablename = 'events';

-- List all indexes
SELECT 
  'Index: ' || indexname as index_name
FROM pg_indexes 
WHERE tablename = 'events'
ORDER BY indexname;

-- Verify foreign keys
SELECT
  'FK: ' || tc.constraint_name as constraint_name,
  kcu.column_name as column_name,
  ccu.table_name || '.' || ccu.column_name as references
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name = 'events';

-- Verify trigger
SELECT 
  'Trigger: ' || trigger_name as trigger_name,
  event_manipulation as on_event,
  action_timing as timing
FROM information_schema.triggers
WHERE event_object_table = 'events';

-- ============================================================================
-- SETUP VERIFICATION COMPLETE!
-- 
-- Expected Results:
-- ✓ Events table created successfully
-- ✓ RLS Status: ENABLED
-- ✓ Total RLS Policies: 4
-- ✓ Total Indexes: 6  
-- ✓ 2 Foreign Keys (to organizations and users)
-- ✓ 1 Trigger (update_events_updated_at)
--
-- If you see any errors above, check:
-- 1. users table exists
-- 2. organizations table exists
-- 3. organization_members table exists
--
-- Next Steps:
-- - Test API endpoints at /api/event
-- - See EVENTS_API_REFERENCE.md for API documentation
-- - See EVENTS_QUICK_START.md for usage examples
-- ============================================================================
