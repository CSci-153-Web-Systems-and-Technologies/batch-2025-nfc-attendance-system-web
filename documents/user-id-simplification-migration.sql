-- ============================================================================
-- USER ID SIMPLIFICATION & AUTH PROVIDER TRACKING MIGRATION
-- ============================================================================
-- Date: October 28, 2025
-- Purpose: Simplify user identification and track authentication providers
-- Changes:
--   1. Use auth_id as primary key (remove separate id column)
--   2. Add auth_provider column to track signup method
--   3. Add has_password flag to indicate if user has set a password
--   4. Update all foreign key relationships
-- ============================================================================

-- IMPORTANT: Run this migration in a transaction and test thoroughly before production!

BEGIN;

-- ============================================================================
-- STEP 1: Add new columns to users table
-- ============================================================================

-- Add auth_provider column to track how user signed up
ALTER TABLE users 
ADD COLUMN auth_provider text NOT NULL DEFAULT 'email' 
CHECK (auth_provider IN ('email', 'google', 'github', 'azure', 'facebook'));

-- Add has_password flag (will be true for email signups, false for OAuth initially)
ALTER TABLE users 
ADD COLUMN has_password boolean NOT NULL DEFAULT false;

-- Add comment for clarity
COMMENT ON COLUMN users.auth_provider IS 'The authentication provider used (email, google, etc.)';
COMMENT ON COLUMN users.has_password IS 'Whether user has set a password (OAuth users can set one later)';

-- ============================================================================
-- STEP 2: Update existing data before making structural changes
-- ============================================================================

-- Mark existing users as having passwords if they signed up via email
-- (You may need to adjust this based on your actual data)
UPDATE users SET has_password = true WHERE auth_provider = 'email';

-- ============================================================================
-- STEP 3: Create temporary mapping table for ID migration
-- ============================================================================

CREATE TEMPORARY TABLE user_id_mapping AS
SELECT id as old_id, auth_id as new_id FROM users;

-- ============================================================================
-- STEP 4: Update foreign key references
-- ============================================================================

-- Update organizations.owner_user_id
UPDATE organizations o
SET owner_user_id = m.new_id
FROM user_id_mapping m
WHERE o.owner_user_id = m.old_id;

-- Update organization_members.user_id
UPDATE organization_members om
SET user_id = m.new_id
FROM user_id_mapping m
WHERE om.user_id = m.old_id;

-- Update events.created_by
UPDATE events e
SET created_by = m.new_id
FROM user_id_mapping m
WHERE e.created_by = m.old_id;

-- ============================================================================
-- STEP 5: Drop dependent objects (views and policies)
-- ============================================================================

-- Drop views that depend on users.id
DROP VIEW IF EXISTS membership_with_user CASCADE;
DROP VIEW IF EXISTS membership_with_organization CASCADE;

-- Drop RLS policies that depend on users.id
-- Organization members policies
DROP POLICY IF EXISTS "Owners and Admins can add members" ON organization_members;
DROP POLICY IF EXISTS "Members can view their own membership" ON organization_members;
DROP POLICY IF EXISTS "Members can view org members" ON organization_members;
DROP POLICY IF EXISTS "Owners and Admins can update members" ON organization_members;
DROP POLICY IF EXISTS "Owners and Admins can remove members" ON organization_members;

-- Events policies
DROP POLICY IF EXISTS "creators_and_admins_can_update_events" ON events;
DROP POLICY IF EXISTS "creators_and_admins_can_delete_events" ON events;
DROP POLICY IF EXISTS "Members can view organization events" ON events;
DROP POLICY IF EXISTS "Admins and Attendance Takers can create events" ON events;

-- Organizations policies
DROP POLICY IF EXISTS "Authenticated users can create organizations" ON organizations;
DROP POLICY IF EXISTS "Users can view all organizations" ON organizations;
DROP POLICY IF EXISTS "Owners can update their organizations" ON organizations;
DROP POLICY IF EXISTS "Owners can delete their organizations" ON organizations;

-- ============================================================================
-- STEP 6: Drop old constraints and relationships
-- ============================================================================

-- Drop foreign key constraints
ALTER TABLE organizations DROP CONSTRAINT IF EXISTS fk_owner_user;
ALTER TABLE organization_members DROP CONSTRAINT IF EXISTS fk_user;
ALTER TABLE events DROP CONSTRAINT IF EXISTS fk_created_by_user;

-- Drop old primary key and unique constraints on users
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_pkey;
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_auth_id_key;

-- Drop the old indexes on id
DROP INDEX IF EXISTS idx_users_auth_id;

-- ============================================================================
-- STEP 7: Remove old id column and make auth_id the primary key
-- ============================================================================

-- Drop the old id column
ALTER TABLE users DROP COLUMN id;

-- Rename auth_id to id for simplicity
ALTER TABLE users RENAME COLUMN auth_id TO id;

-- Make id the primary key
ALTER TABLE users ADD PRIMARY KEY (id);

-- Recreate index on email (should already exist but ensuring it's there)
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Add index on auth_provider for filtering
CREATE INDEX IF NOT EXISTS idx_users_auth_provider ON users(auth_provider);

-- ============================================================================
-- STEP 8: Recreate foreign key constraints with proper relationships
-- ============================================================================

-- Organizations owner reference
ALTER TABLE organizations
ADD CONSTRAINT fk_owner_user
FOREIGN KEY (owner_user_id) REFERENCES users(id)
ON DELETE NO ACTION;

-- Organization members reference
ALTER TABLE organization_members
ADD CONSTRAINT fk_user
FOREIGN KEY (user_id) REFERENCES users(id)
ON DELETE CASCADE;

-- Events created_by reference
ALTER TABLE events
ADD CONSTRAINT fk_created_by_user
FOREIGN KEY (created_by) REFERENCES users(id)
ON DELETE CASCADE;

-- ============================================================================
-- STEP 9: Recreate RLS policies with simplified structure
-- ============================================================================

-- Users table policies
DROP POLICY IF EXISTS "Users can view their own profile" ON users;
DROP POLICY IF EXISTS "Users can update their own profile" ON users;
DROP POLICY IF EXISTS "Users can view all user profiles" ON users;
DROP POLICY IF EXISTS "Users can insert their own profile" ON users;

CREATE POLICY "Users can view their own profile"
ON users FOR SELECT
TO authenticated
USING (id = auth.uid());

CREATE POLICY "Users can update their own profile"
ON users FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

CREATE POLICY "Users can insert their own profile"
ON users FOR INSERT
TO authenticated
WITH CHECK (id = auth.uid());

CREATE POLICY "Users can view all user profiles"
ON users FOR SELECT
TO authenticated
USING (true);

-- Organizations policies
CREATE POLICY "Authenticated users can create organizations"
ON organizations FOR INSERT
TO authenticated
WITH CHECK (owner_user_id = auth.uid());

CREATE POLICY "Users can view all organizations"
ON organizations FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Owners can update their organizations"
ON organizations FOR UPDATE
TO authenticated
USING (owner_user_id = auth.uid())
WITH CHECK (owner_user_id = auth.uid());

CREATE POLICY "Owners can delete their organizations"
ON organizations FOR DELETE
TO authenticated
USING (owner_user_id = auth.uid());

-- Organization members policies
CREATE POLICY "Owners and Admins can add members"
ON organization_members FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM organization_members om
    WHERE om.organization_id = organization_members.organization_id
    AND om.user_id = auth.uid()
    AND om.role IN ('Owner', 'Admin')
  )
);

CREATE POLICY "Members can view their own membership"
ON organization_members FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Members can view org members"
ON organization_members FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM organization_members om
    WHERE om.organization_id = organization_members.organization_id
    AND om.user_id = auth.uid()
  )
);

CREATE POLICY "Owners and Admins can update members"
ON organization_members FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM organization_members om
    WHERE om.organization_id = organization_members.organization_id
    AND om.user_id = auth.uid()
    AND om.role IN ('Owner', 'Admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM organization_members om
    WHERE om.organization_id = organization_members.organization_id
    AND om.user_id = auth.uid()
    AND om.role IN ('Owner', 'Admin')
  )
);

CREATE POLICY "Owners and Admins can remove members"
ON organization_members FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM organization_members om
    WHERE om.organization_id = organization_members.organization_id
    AND om.user_id = auth.uid()
    AND om.role IN ('Owner', 'Admin')
  )
);

-- Events policies
CREATE POLICY "Members can view organization events"
ON events FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM organization_members om
    WHERE om.organization_id = events.organization_id
    AND om.user_id = auth.uid()
  )
);

CREATE POLICY "Admins and Attendance Takers can create events"
ON events FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM organization_members om
    WHERE om.organization_id = events.organization_id
    AND om.user_id = auth.uid()
    AND om.role IN ('Owner', 'Admin', 'Attendance Taker')
  )
);

CREATE POLICY "creators_and_admins_can_update_events"
ON events FOR UPDATE
TO authenticated
USING (
  created_by = auth.uid()
  OR EXISTS (
    SELECT 1 FROM organization_members om
    WHERE om.organization_id = events.organization_id
    AND om.user_id = auth.uid()
    AND om.role IN ('Owner', 'Admin')
  )
)
WITH CHECK (
  created_by = auth.uid()
  OR EXISTS (
    SELECT 1 FROM organization_members om
    WHERE om.organization_id = events.organization_id
    AND om.user_id = auth.uid()
    AND om.role IN ('Owner', 'Admin')
  )
);

CREATE POLICY "creators_and_admins_can_delete_events"
ON events FOR DELETE
TO authenticated
USING (
  created_by = auth.uid()
  OR EXISTS (
    SELECT 1 FROM organization_members om
    WHERE om.organization_id = events.organization_id
    AND om.user_id = auth.uid()
    AND om.role IN ('Owner', 'Admin')
  )
);

-- ============================================================================
-- STEP 10: Recreate views with new user structure
-- ============================================================================

-- Recreate membership_with_user view
CREATE OR REPLACE VIEW membership_with_user AS
SELECT 
  om.id,
  om.organization_id,
  om.user_id,
  om.role,
  om.joined_at,
  om.updated_at,
  u.name as user_name,
  u.email as user_email,
  u.user_type,
  u.auth_provider,
  u.has_password
FROM organization_members om
JOIN users u ON om.user_id = u.id;

-- Recreate membership_with_organization view
CREATE OR REPLACE VIEW membership_with_organization AS
SELECT 
  om.id,
  om.organization_id,
  om.user_id,
  om.role,
  om.joined_at,
  om.updated_at,
  o.name as organization_name,
  o.description as organization_description,
  o.owner_user_id as organization_owner_id
FROM organization_members om
JOIN organizations o ON om.organization_id = o.id;

-- ============================================================================
-- STEP 11: Add helpful database functions
-- ============================================================================

-- Function to check if a user has set a password
CREATE OR REPLACE FUNCTION user_can_reset_password(user_email text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_record RECORD;
BEGIN
  SELECT auth_provider, has_password INTO user_record
  FROM users
  WHERE email = user_email;
  
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  
  -- User can reset password if they have one set OR if they're an email user
  RETURN user_record.has_password OR user_record.auth_provider = 'email';
END;
$$;

-- Function to update has_password flag when user sets password
CREATE OR REPLACE FUNCTION mark_user_password_set()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- This will be called when password is set in auth.users
  UPDATE users
  SET has_password = true
  WHERE id = NEW.id;
  
  RETURN NEW;
END;
$$;

-- ============================================================================
-- STEP 12: Add comments for documentation
-- ============================================================================

COMMENT ON TABLE users IS 'User profiles with auth_id as primary key (matches Supabase auth.users.id)';
COMMENT ON COLUMN users.id IS 'Primary key - matches Supabase auth.users.id (formerly auth_id)';
COMMENT ON COLUMN users.email IS 'User email address - must match auth.users.email';

-- ============================================================================
-- VERIFICATION QUERIES (uncomment to run after migration)
-- ============================================================================

/*
-- Verify all foreign keys are working
SELECT 
  'organizations' as table_name,
  COUNT(*) as records,
  COUNT(DISTINCT owner_user_id) as unique_users
FROM organizations
UNION ALL
SELECT 
  'organization_members',
  COUNT(*),
  COUNT(DISTINCT user_id)
FROM organization_members
UNION ALL
SELECT 
  'events',
  COUNT(*),
  COUNT(DISTINCT created_by)
FROM events;

-- Check users table structure
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'users'
ORDER BY ordinal_position;

-- Verify all users have valid auth_provider values
SELECT auth_provider, has_password, COUNT(*) as count
FROM users
GROUP BY auth_provider, has_password;
*/

COMMIT;

-- ============================================================================
-- ROLLBACK PLAN (in case of issues)
-- ============================================================================

/*
-- If you need to rollback, run ROLLBACK; instead of COMMIT above
-- However, you may need to restore from backup if the transaction was committed

ROLLBACK;
*/

