# Events Backend Setup - NFC Attendance System

## 📊 Database Schema

This document contains all SQL statements needed to set up the events backend in Supabase.

---

## � Complete Setup Script

**Copy and paste this entire script into your Supabase SQL Editor:**

```sql
-- ============================================================================
-- EVENTS BACKEND SETUP - COMPLETE SCRIPT
-- NFC Attendance System
-- Run this entire script in Supabase SQL Editor
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
-- 6. GRANT PERMISSIONS (if needed)
-- ----------------------------------------------------------------------------

-- Grant necessary permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON events TO authenticated;

-- ============================================================================
-- SETUP COMPLETE!
-- ============================================================================

-- Verify the setup
SELECT 
  'Events table created successfully!' as status,
  COUNT(*) as event_count
FROM events;

SELECT 
  'RLS is ' || CASE WHEN rowsecurity THEN 'ENABLED ✓' ELSE 'DISABLED ✗' END as rls_status
FROM pg_tables 
WHERE tablename = 'events';

SELECT 
  'Total policies: ' || COUNT(*) as policy_count
FROM pg_policies 
WHERE tablename = 'events';

SELECT 
  'Total indexes: ' || COUNT(*) as index_count
FROM pg_indexes 
WHERE tablename = 'events';
```

---

## 🗄️ Table Structure Details

### Events Table

---

## �️ Table Structure Details

### Events Table

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | No | `gen_random_uuid()` | Primary key, unique event identifier |
| `event_name` | TEXT | No | - | Name of the event |
| `date` | TIMESTAMPTZ | No | - | Event date and time with timezone |
| `organization_id` | UUID | No | - | Foreign key to organizations table |
| `description` | TEXT | Yes | NULL | Optional event description |
| `location` | TEXT | Yes | NULL | Optional event location |
| `created_by` | UUID | No | - | Foreign key to users table (creator) |
| `created_at` | TIMESTAMPTZ | No | `NOW()` | Timestamp when record was created |
| `updated_at` | TIMESTAMPTZ | No | `NOW()` | Timestamp when record was last updated |

### Constraints

- **Primary Key**: `id`
- **Foreign Keys**:
  - `organization_id` → `organizations(id)` with CASCADE delete
  - `created_by` → `users(id)` with CASCADE delete

### Indexes

1. `idx_events_organization_id` - For organization lookups
2. `idx_events_date` - For date filtering and sorting
3. `idx_events_created_by` - For creator lookups
4. `idx_events_created_at` - For creation time sorting
5. `idx_events_name` - For event name searches
6. `idx_events_org_date` - Composite index for common queries

---

## 🔐 Row Level Security (RLS) Policies

### Policy Summary

| Policy Name | Operation | Who Can Access | Conditions |
|------------|-----------|----------------|------------|
| Members can view organization events | SELECT | All Members | Must be member of event's organization |
| Authorized members can create events | INSERT | Owner, Admin, Attendance Taker | Must have authorized role |
| Authorized members can update events | UPDATE | Owner, Admin, Attendance Taker | Must have authorized role |
| Owners and Admins can delete events | DELETE | Owner, Admin | Must have admin privileges |

### Permission Matrix

| Role | View | Create | Update | Delete |
|------|------|--------|--------|--------|
| Owner | ✅ | ✅ | ✅ | ✅ |
| Admin | ✅ | ✅ | ✅ | ✅ |
| Attendance Taker | ✅ | ✅ | ✅ | ❌ |
| Member | ✅ | ❌ | ❌ | ❌ |

---

---

## 🎯 Usage Examples

### Create an Event

```sql
INSERT INTO events (event_name, date, organization_id, description, location, created_by)
VALUES (
  'Team Meeting',
  '2025-11-15 14:00:00+00',
  '123e4567-e89b-12d3-a456-426614174001', -- Replace with your org ID
  'Monthly team sync meeting',
  'Conference Room A',
  '123e4567-e89b-12d3-a456-426614174002'  -- Replace with your user ID
);
```

### Query Events by Organization

```sql
SELECT 
  e.*,
  o.name as organization_name,
  u.name as creator_name
FROM events e
JOIN organizations o ON e.organization_id = o.id
JOIN users u ON e.created_by = u.id
WHERE e.organization_id = '123e4567-e89b-12d3-a456-426614174001'
ORDER BY e.date DESC;
```

### Query Upcoming Events

```sql
SELECT 
  e.*,
  o.name as organization_name
FROM events e
JOIN organizations o ON e.organization_id = o.id
WHERE e.date >= NOW()
ORDER BY e.date ASC
LIMIT 10;
```

### Update an Event

```sql
UPDATE events
SET 
  event_name = 'Updated Team Meeting',
  location = 'Conference Room B',
  updated_at = NOW()
WHERE id = '123e4567-e89b-12d3-a456-426614174000';
```

### Delete an Event

```sql
DELETE FROM events
WHERE id = '123e4567-e89b-12d3-a456-426614174000';
```

### Search Events

```sql
SELECT *
FROM events
WHERE 
  event_name ILIKE '%meeting%'
  OR description ILIKE '%meeting%'
  OR location ILIKE '%meeting%'
ORDER BY date DESC;
```

---

## 🧪 Testing the Setup

After running the complete setup script, verify everything is working:

### 1. Check Table Exists

```sql
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_name = 'events'
) as table_exists;
```

Expected result: `true`

### 2. Check RLS is Enabled

```sql
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'events';
```

Expected result: `rowsecurity = true`

### 3. View All Policies

```sql
SELECT 
  policyname,
  cmd,
  qual IS NOT NULL as has_using,
  with_check IS NOT NULL as has_with_check
FROM pg_policies 
WHERE tablename = 'events'
ORDER BY cmd;
```

Expected result: 4 policies (SELECT, INSERT, UPDATE, DELETE)

### 4. Check Indexes

```sql
SELECT 
  indexname, 
  indexdef 
FROM pg_indexes 
WHERE tablename = 'events'
ORDER BY indexname;
```

Expected result: 6 indexes

### 5. Check Triggers

```sql
SELECT 
  trigger_name,
  event_manipulation,
  action_timing
FROM information_schema.triggers
WHERE event_object_table = 'events';
```

Expected result: `update_events_updated_at` trigger

### 6. Test Insert (with proper auth context)

```sql
-- This will work if you're authenticated with proper permissions
INSERT INTO events (event_name, date, organization_id, created_by)
VALUES (
  'Test Event',
  NOW() + INTERVAL '1 day',
  (SELECT id FROM organizations LIMIT 1),
  (SELECT id FROM users WHERE auth_id = auth.uid())
);
```

### 7. Verify Foreign Key Constraints

```sql
SELECT
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name = 'events';
```

Expected result: 2 foreign keys (to organizations and users)

---

## 📋 Prerequisites

Before running the setup, ensure these tables exist:

### Required Tables

1. **`users` table** with columns:
   - `id` (UUID, primary key)
   - `auth_id` (UUID, references Supabase auth.users)
   - Other user profile fields

2. **`organizations` table** with columns:
   - `id` (UUID, primary key)
   - `name` (TEXT)
   - Other organization fields

3. **`organization_members` table** with columns:
   - `id` (UUID, primary key)
   - `organization_id` (UUID)
   - `user_id` (UUID)
   - `role` (TEXT with values: 'Owner', 'Admin', 'Attendance Taker', 'Member')

### Check Prerequisites

Run this query to verify all prerequisites:

```sql
-- Check if required tables exist
SELECT 
  table_name,
  CASE 
    WHEN table_name = 'users' THEN '✓ Users table exists'
    WHEN table_name = 'organizations' THEN '✓ Organizations table exists'
    WHEN table_name = 'organization_members' THEN '✓ Organization members table exists'
  END as status
FROM information_schema.tables
WHERE table_name IN ('users', 'organizations', 'organization_members')
  AND table_schema = 'public';
```

If any tables are missing, you need to set them up first. See:
- [USER_BACKEND_SETUP.md](./USER_BACKEND_SETUP.md) for users setup
- [ORGANIZATION_BACKEND_SETUP.md](./ORGANIZATION_BACKEND_SETUP.md) for organizations setup

---

## 🔧 Troubleshooting

### Issue: Foreign Key Constraint Errors

**Problem**: Getting errors about foreign key violations

**Solution**: 
1. Ensure `organizations` and `users` tables exist
2. Verify the UUIDs you're using actually exist in those tables
3. Check that foreign key columns are properly defined

```sql
-- Verify organization exists
SELECT id, name FROM organizations WHERE id = 'your-org-id';

-- Verify user exists
SELECT id, name FROM users WHERE id = 'your-user-id';
```

### Issue: RLS Policies Not Working

**Problem**: Can't insert/update/delete even with proper permissions

**Solution**:
1. Verify RLS is enabled
2. Check you're authenticated (auth.uid() returns a value)
3. Verify your user has proper role in organization_members

```sql
-- Check your auth status
SELECT auth.uid() as my_auth_id;

-- Check your user record
SELECT * FROM users WHERE auth_id = auth.uid();

-- Check your organization memberships
SELECT om.*, o.name 
FROM organization_members om
JOIN organizations o ON om.organization_id = o.id
WHERE om.user_id = (SELECT id FROM users WHERE auth_id = auth.uid());
```

### Issue: Trigger Not Firing

**Problem**: `updated_at` not updating automatically

**Solution**:
1. Verify trigger exists
2. Check trigger function exists
3. Re-create trigger if needed

```sql
-- Check trigger
SELECT * FROM information_schema.triggers 
WHERE event_object_table = 'events';

-- Drop and recreate if needed
DROP TRIGGER IF EXISTS update_events_updated_at ON events;
CREATE TRIGGER update_events_updated_at
  BEFORE UPDATE ON events
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

### Issue: Performance Issues

**Problem**: Queries are slow

**Solution**:
1. Verify indexes exist
2. Use EXPLAIN ANALYZE to check query plans
3. Add specific indexes if needed

```sql
-- Check which indexes exist
SELECT * FROM pg_indexes WHERE tablename = 'events';

-- Analyze a query
EXPLAIN ANALYZE
SELECT * FROM events 
WHERE organization_id = 'some-uuid'
AND date >= NOW()
ORDER BY date ASC;
```

---

## 🔄 Migration & Rollback

### To Roll Back (Remove Everything)

If you need to completely remove the events feature:

```sql
-- WARNING: This will delete ALL events data!

-- Drop policies first
DROP POLICY IF EXISTS "Members can view organization events" ON events;
DROP POLICY IF EXISTS "Authorized members can create events" ON events;
DROP POLICY IF EXISTS "Authorized members can update events" ON events;
DROP POLICY IF EXISTS "Owners and Admins can delete events" ON events;

-- Drop trigger
DROP TRIGGER IF EXISTS update_events_updated_at ON events;

-- Drop table (will also drop indexes automatically)
DROP TABLE IF EXISTS events CASCADE;

-- Optionally drop the trigger function if not used elsewhere
-- DROP FUNCTION IF EXISTS update_updated_at_column();
```

### To Modify Schema

If you need to add/modify columns:

```sql
-- Add a new column
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS max_attendees INTEGER;

-- Modify a column
ALTER TABLE events 
ALTER COLUMN description TYPE VARCHAR(1000);

-- Add a constraint
ALTER TABLE events
ADD CONSTRAINT check_future_date 
CHECK (date >= created_at);
```

---

## 📝 Notes

- **Date Storage**: Event dates are stored as TIMESTAMPTZ (timestamp with timezone) for proper timezone handling
- **Permissions**: 
  - All members can view events in their organizations
  - Only Owner, Admin, and Attendance Taker roles can create/update events
  - Only Owner and Admin roles can delete events
- **Cascading Deletes**: If an organization or user is deleted, their events are automatically deleted
- **Automatic Timestamps**: The `updated_at` field is automatically updated on any modification
- **Performance**: Multiple indexes ensure fast queries for common operations

## 🔄 Migration Path

If you need to modify the schema later:

1. Always test changes in a development environment first
2. Create backups before running migrations on production
3. Use Supabase migrations for version control of schema changes
4. Consider data migration scripts for existing data

## 🚀 Next Steps

After setting up the database:

1. ✅ Create TypeScript types/interfaces for events
2. ✅ Implement event service layer
3. ✅ Create API routes for event operations
4. Add event attendance tracking (future feature)
5. Add event notifications (future feature)
