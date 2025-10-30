-- ============================================================================
-- MEMBERSHIP FEATURE - COMPLETE SUPABASE SETUP
-- ============================================================================
-- This script sets up the complete membership feature for the NFC Attendance System
-- Run this in your Supabase SQL Editor
-- ============================================================================

-- ============================================================================
-- 1. CREATE TABLE
-- ============================================================================

-- Create organization_members table
CREATE TABLE IF NOT EXISTS organization_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('Owner', 'Admin', 'Attendance Taker', 'Member')),
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  
  -- Ensure a user can only have one membership per organization
  UNIQUE(user_id, organization_id)
);

-- Add comment to table
COMMENT ON TABLE organization_members IS 'Stores membership relationships between users and organizations with roles';

-- ============================================================================
-- 2. CREATE INDEXES
-- ============================================================================

-- Index for user lookups
CREATE INDEX IF NOT EXISTS idx_organization_members_user_id 
ON organization_members(user_id);

-- Index for organization lookups
CREATE INDEX IF NOT EXISTS idx_organization_members_organization_id 
ON organization_members(organization_id);

-- Index for role filtering
CREATE INDEX IF NOT EXISTS idx_organization_members_role 
ON organization_members(role);

-- Index for sorting by join date
CREATE INDEX IF NOT EXISTS idx_organization_members_joined_at 
ON organization_members(joined_at DESC);

-- Composite index for common queries
CREATE INDEX IF NOT EXISTS idx_organization_members_user_org 
ON organization_members(user_id, organization_id);

-- Composite index for role-based queries
CREATE INDEX IF NOT EXISTS idx_organization_members_org_role 
ON organization_members(organization_id, role);

-- ============================================================================
-- 3. CREATE TRIGGER FUNCTION FOR UPDATED_AT
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc'::text, NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for organization_members
DROP TRIGGER IF EXISTS update_organization_members_updated_at ON organization_members;
CREATE TRIGGER update_organization_members_updated_at
  BEFORE UPDATE ON organization_members
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 4. CREATE SINGLE OWNER CONSTRAINT
-- ============================================================================

-- Function to ensure only one owner per organization
CREATE OR REPLACE FUNCTION check_single_owner()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.role = 'Owner' THEN
    -- Check if there's already an owner for this organization (excluding current record)
    IF EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_id = NEW.organization_id
      AND role = 'Owner'
      AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::UUID)
    ) THEN
      RAISE EXCEPTION 'Organization can only have one owner. Use transfer ownership instead.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to enforce single owner
DROP TRIGGER IF EXISTS check_single_owner_trigger ON organization_members;
CREATE TRIGGER check_single_owner_trigger
  BEFORE INSERT OR UPDATE ON organization_members
  FOR EACH ROW
  EXECUTE FUNCTION check_single_owner();

-- ============================================================================
-- 5. ENABLE ROW LEVEL SECURITY
-- ============================================================================

-- Enable RLS on organization_members table
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 6. CREATE RLS POLICIES
-- ============================================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own memberships" ON organization_members;
DROP POLICY IF EXISTS "Users can view organization memberships they belong to" ON organization_members;
DROP POLICY IF EXISTS "Admins and Owners can add members" ON organization_members;
DROP POLICY IF EXISTS "Admins and Owners can update memberships" ON organization_members;
DROP POLICY IF EXISTS "Admins and Owners can remove members" ON organization_members;
DROP POLICY IF EXISTS "Users can leave organizations" ON organization_members;

-- Policy 1: Users can view their own memberships
CREATE POLICY "Users can view their own memberships"
  ON organization_members
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy 2: Users can view memberships of organizations they belong to
CREATE POLICY "Users can view organization memberships they belong to"
  ON organization_members
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = organization_members.organization_id
      AND om.user_id = auth.uid()
    )
  );

-- Policy 3: Admins and Owners can insert new memberships
CREATE POLICY "Admins and Owners can add members"
  ON organization_members
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = organization_members.organization_id
      AND om.user_id = auth.uid()
      AND om.role IN ('Owner', 'Admin')
    )
  );

-- Policy 4: Admins and Owners can update memberships (except Owner role)
CREATE POLICY "Admins and Owners can update memberships"
  ON organization_members
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = organization_members.organization_id
      AND om.user_id = auth.uid()
      AND om.role IN ('Owner', 'Admin')
    )
    AND organization_members.role != 'Owner'
  )
  WITH CHECK (
    role != 'Owner'
  );

-- Policy 5: Admins and Owners can delete memberships (except Owner)
CREATE POLICY "Admins and Owners can remove members"
  ON organization_members
  FOR DELETE
  USING (
    role != 'Owner'
    AND EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = organization_members.organization_id
      AND om.user_id = auth.uid()
      AND om.role IN ('Owner', 'Admin')
    )
  );

-- Policy 6: Users can remove their own membership (leave organization)
CREATE POLICY "Users can leave organizations"
  ON organization_members
  FOR DELETE
  USING (
    auth.uid() = user_id
    AND role != 'Owner'
  );

-- ============================================================================
-- 7. CREATE HELPER FUNCTIONS
-- ============================================================================

-- Function to check if user has specific role in organization
CREATE OR REPLACE FUNCTION user_has_role(
  p_user_id UUID,
  p_organization_id UUID,
  p_role TEXT
)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM organization_members
    WHERE user_id = p_user_id
    AND organization_id = p_organization_id
    AND role = p_role
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user has permission level in organization
CREATE OR REPLACE FUNCTION user_has_permission(
  p_user_id UUID,
  p_organization_id UUID,
  p_required_role TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  v_user_role TEXT;
  v_role_level INT;
  v_required_level INT;
BEGIN
  -- Get user's role
  SELECT role INTO v_user_role
  FROM organization_members
  WHERE user_id = p_user_id
  AND organization_id = p_organization_id;

  -- If no membership found, return false
  IF v_user_role IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Define role hierarchy
  v_role_level := CASE v_user_role
    WHEN 'Owner' THEN 4
    WHEN 'Admin' THEN 3
    WHEN 'Attendance Taker' THEN 2
    WHEN 'Member' THEN 1
    ELSE 0
  END;

  v_required_level := CASE p_required_role
    WHEN 'Owner' THEN 4
    WHEN 'Admin' THEN 3
    WHEN 'Attendance Taker' THEN 2
    WHEN 'Member' THEN 1
    ELSE 0
  END;

  RETURN v_role_level >= v_required_level;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get membership count for an organization
CREATE OR REPLACE FUNCTION get_organization_member_count(p_organization_id UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::INTEGER
    FROM organization_members
    WHERE organization_id = p_organization_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get membership count for a user
CREATE OR REPLACE FUNCTION get_user_membership_count(p_user_id UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::INTEGER
    FROM organization_members
    WHERE user_id = p_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's role in organization
CREATE OR REPLACE FUNCTION get_user_role_in_organization(
  p_user_id UUID,
  p_organization_id UUID
)
RETURNS TEXT AS $$
DECLARE
  v_role TEXT;
BEGIN
  SELECT role INTO v_role
  FROM organization_members
  WHERE user_id = p_user_id
  AND organization_id = p_organization_id;
  
  RETURN v_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 8. GRANT PERMISSIONS
-- ============================================================================

-- Grant usage on helper functions to authenticated users
GRANT EXECUTE ON FUNCTION user_has_role(UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION user_has_permission(UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_organization_member_count(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_membership_count(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_role_in_organization(UUID, UUID) TO authenticated;

-- ============================================================================
-- 9. CREATE VIEWS (OPTIONAL)
-- ============================================================================

-- View for memberships with organization details
CREATE OR REPLACE VIEW membership_with_organization AS
SELECT 
  om.id,
  om.user_id,
  om.organization_id,
  om.role,
  om.joined_at,
  om.updated_at,
  o.name as organization_name,
  o.description as organization_description,
  o.owner_user_id as organization_owner_id
FROM organization_members om
JOIN organizations o ON om.organization_id = o.id;

-- View for memberships with user details
CREATE OR REPLACE VIEW membership_with_user AS
SELECT 
  om.id,
  om.user_id,
  om.organization_id,
  om.role,
  om.joined_at,
  om.updated_at,
  u.name as user_name,
  u.email as user_email,
  u.user_type,
  u.nfc_tag_id
FROM organization_members om
JOIN users u ON om.user_id = u.id;

-- ============================================================================
-- 10. VERIFICATION QUERIES
-- ============================================================================

-- Uncomment to run verification queries

/*
-- Check table structure
SELECT 
  column_name, 
  data_type, 
  is_nullable, 
  column_default
FROM information_schema.columns
WHERE table_name = 'organization_members'
ORDER BY ordinal_position;

-- Check indexes
SELECT 
  indexname, 
  indexdef
FROM pg_indexes
WHERE tablename = 'organization_members';

-- Check RLS policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename = 'organization_members';

-- Check triggers
SELECT 
  trigger_name,
  event_manipulation,
  action_statement
FROM information_schema.triggers
WHERE event_object_table = 'organization_members';

-- Count memberships
SELECT COUNT(*) as total_memberships FROM organization_members;

-- Count by role
SELECT 
  role,
  COUNT(*) as count
FROM organization_members
GROUP BY role
ORDER BY count DESC;
*/

-- ============================================================================
-- SETUP COMPLETE
-- ============================================================================
-- The membership feature is now fully set up!
-- Next steps:
-- 1. Test the API endpoints
-- 2. Add sample data if needed
-- 3. Monitor RLS policies in production
-- 4. Review indexes for query performance
-- ============================================================================
