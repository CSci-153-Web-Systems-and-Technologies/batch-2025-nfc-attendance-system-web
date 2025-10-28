# Events Backend Setup - NFC Attendance System

## 📊 Database Schema

This document contains all SQL statements needed to set up the events backend in Supabase.

## 🗄️ Tables

### 1. Events Table

```sql
-- Create events table
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

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_events_organization_id ON events(organization_id);
CREATE INDEX IF NOT EXISTS idx_events_date ON events(date DESC);
CREATE INDEX IF NOT EXISTS idx_events_created_by ON events(created_by);
CREATE INDEX IF NOT EXISTS idx_events_created_at ON events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_name ON events(event_name);

-- Create a composite index for common queries
CREATE INDEX IF NOT EXISTS idx_events_org_date ON events(organization_id, date DESC);
```

## 🔐 Row Level Security (RLS) Policies

### Enable RLS

```sql
-- Enable Row Level Security on events table
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
```

### Events Table Policies

```sql
-- Policy: Members can view events in their organizations
CREATE POLICY "Members can view organization events"
  ON events
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = events.organization_id
      AND organization_members.user_id IN (
        SELECT id FROM users WHERE auth_id = auth.uid()
      )
    )
  );

-- Policy: Only Owners, Admins, and Attendance Takers can create events
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
```

## 🔄 Automatic Updated Timestamp

```sql
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
```

## 🎯 Usage Examples

### Create an Event

```sql
INSERT INTO events (event_name, date, organization_id, description, location, created_by)
VALUES (
  'Team Meeting',
  '2025-11-15 14:00:00+00',
  'org-uuid-here',
  'Monthly team sync meeting',
  'Conference Room A',
  'user-uuid-here'
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
WHERE e.organization_id = 'org-uuid-here'
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

## 🧪 Testing the Setup

After running the SQL commands above, verify the setup:

```sql
-- Check if table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_name = 'events'
);

-- Check RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'events';

-- View all policies on events table
SELECT * FROM pg_policies WHERE tablename = 'events';

-- Check indexes
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'events';
```

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
