-- ============================================================================
-- ORGANIZATION FEATURE - COMPLETE SUPABASE SETUP
-- ============================================================================
-- This script sets up the organization tables for the NFC Attendance System
-- Run this in your Supabase SQL Editor BEFORE using the organization features
-- ============================================================================

-- ============================================================================
-- 1. CREATE ORGANIZATIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  owner_user_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Foreign key to users table
  CONSTRAINT fk_owner_user
    FOREIGN KEY (owner_user_id)
    REFERENCES users(id)
    ON DELETE CASCADE
);

COMMENT ON TABLE organizations IS 'Stores organization information for the NFC attendance system';

-- ============================================================================
-- 2. CREATE INDEXES FOR ORGANIZATIONS
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_organizations_owner ON organizations(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_organizations_created_at ON organizations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_organizations_name ON organizations(name);

-- ============================================================================
-- 3. ENABLE ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 4. CREATE RLS POLICIES FOR ORGANIZATIONS
-- ============================================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Members can view their organizations" ON organizations;
DROP POLICY IF EXISTS "Authenticated users can create organizations" ON organizations;
DROP POLICY IF EXISTS "Owners and Admins can update organizations" ON organizations;
DROP POLICY IF EXISTS "Owners can delete organizations" ON organizations;

-- Policy: Anyone can view organizations they are a member of
CREATE POLICY "Members can view their organizations"
  ON organizations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = organizations.id
      AND organization_members.user_id IN (
        SELECT id FROM users WHERE auth_id = auth.uid()
      )
    )
  );

-- Policy: Authenticated users can create organizations
CREATE POLICY "Authenticated users can create organizations"
  ON organizations
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND owner_user_id IN (
      SELECT id FROM users WHERE auth_id = auth.uid()
    )
  );

-- Policy: Owners and Admins can update organizations
CREATE POLICY "Owners and Admins can update organizations"
  ON organizations
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = organizations.id
      AND organization_members.user_id IN (
        SELECT id FROM users WHERE auth_id = auth.uid()
      )
      AND organization_members.role IN ('Owner', 'Admin')
    )
  );

-- Policy: Only owners can delete organizations
CREATE POLICY "Owners can delete organizations"
  ON organizations
  FOR DELETE
  USING (
    owner_user_id IN (
      SELECT id FROM users WHERE auth_id = auth.uid()
    )
  );

-- ============================================================================
-- 5. CREATE TRIGGERS FOR AUTO-UPDATING TIMESTAMPS
-- ============================================================================

-- Create or replace the trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS update_organizations_updated_at ON organizations;

-- Create trigger for organizations table
CREATE TRIGGER update_organizations_updated_at
  BEFORE UPDATE ON organizations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 6. VERIFICATION QUERIES
-- ============================================================================

-- Uncomment these to verify the setup:

-- Check if organizations table exists
-- SELECT table_name 
-- FROM information_schema.tables 
-- WHERE table_schema = 'public' 
-- AND table_name = 'organizations';

-- Check if indexes exist
-- SELECT indexname 
-- FROM pg_indexes 
-- WHERE tablename = 'organizations';

-- Check if RLS is enabled
-- SELECT tablename, rowsecurity 
-- FROM pg_tables 
-- WHERE tablename = 'organizations';

-- Check policies
-- SELECT schemaname, tablename, policyname, cmd 
-- FROM pg_policies 
-- WHERE tablename = 'organizations';

-- ============================================================================
-- SETUP COMPLETE
-- ============================================================================
-- The organizations table is now ready to use!
-- Make sure you have also run setup-membership.sql for organization_members table
-- ============================================================================
