-- ============================================================================
-- ORGANIZATION JOIN REQUESTS TABLE - COMPLETE SETUP
-- ============================================================================
-- This script creates the join requests table and RLS policies
-- Allows users to request to join organizations with admin approval
-- ============================================================================

-- ============================================================================
-- 1. CREATE ORGANIZATION_JOIN_REQUESTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS organization_join_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  user_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Foreign keys
  CONSTRAINT fk_organization
    FOREIGN KEY (organization_id)
    REFERENCES organizations(id)
    ON DELETE CASCADE,
  
  CONSTRAINT fk_user
    FOREIGN KEY (user_id)
    REFERENCES users(id)
    ON DELETE CASCADE,
  
  CONSTRAINT fk_reviewed_by
    FOREIGN KEY (reviewed_by)
    REFERENCES users(id)
    ON DELETE SET NULL,
  
  -- Unique constraint: one pending request per user per organization
  CONSTRAINT unique_pending_request
    UNIQUE (organization_id, user_id)
);

COMMENT ON TABLE organization_join_requests IS 'Stores pending join requests for organizations';
COMMENT ON COLUMN organization_join_requests.status IS 'Request status: pending, approved, or rejected';
COMMENT ON COLUMN organization_join_requests.reviewed_by IS 'User ID of the admin/owner who reviewed the request';

-- ============================================================================
-- 2. CREATE INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_join_requests_org_id ON organization_join_requests(organization_id);
CREATE INDEX IF NOT EXISTS idx_join_requests_user_id ON organization_join_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_join_requests_status ON organization_join_requests(status);
CREATE INDEX IF NOT EXISTS idx_join_requests_org_status ON organization_join_requests(organization_id, status);

-- ============================================================================
-- 3. ENABLE ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE organization_join_requests ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 4. CREATE RLS POLICIES
-- ============================================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "users_can_create_join_requests" ON organization_join_requests;
DROP POLICY IF EXISTS "users_can_view_own_requests" ON organization_join_requests;
DROP POLICY IF EXISTS "admins_can_view_org_requests" ON organization_join_requests;
DROP POLICY IF EXISTS "admins_can_update_requests" ON organization_join_requests;
DROP POLICY IF EXISTS "users_can_delete_own_pending_requests" ON organization_join_requests;

-- Policy: Users can create join requests for themselves
CREATE POLICY "users_can_create_join_requests"
  ON organization_join_requests
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND status = 'pending'
  );

-- Policy: Users can view their own join requests
CREATE POLICY "users_can_view_own_requests"
  ON organization_join_requests
  FOR SELECT
  USING (
    user_id = auth.uid()
  );

-- Policy: Organization owners and admins can view requests for their organization
CREATE POLICY "admins_can_view_org_requests"
  ON organization_join_requests
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = organization_join_requests.organization_id
      AND organization_members.user_id = auth.uid()
      AND organization_members.role IN ('Owner', 'Admin')
    )
  );

-- Policy: Organization owners and admins can update requests (approve/reject)
CREATE POLICY "admins_can_update_requests"
  ON organization_join_requests
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = organization_join_requests.organization_id
      AND organization_members.user_id = auth.uid()
      AND organization_members.role IN ('Owner', 'Admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = organization_join_requests.organization_id
      AND organization_members.user_id = auth.uid()
      AND organization_members.role IN ('Owner', 'Admin')
    )
  );

-- Policy: Users can delete their own pending requests (cancel request)
CREATE POLICY "users_can_delete_own_pending_requests"
  ON organization_join_requests
  FOR DELETE
  USING (
    user_id = auth.uid()
    AND status = 'pending'
  );

-- ============================================================================
-- 5. CREATE TRIGGERS FOR AUTO-UPDATING TIMESTAMPS
-- ============================================================================

-- Create trigger for organization_join_requests table
DROP TRIGGER IF EXISTS update_join_requests_updated_at ON organization_join_requests;

CREATE TRIGGER update_join_requests_updated_at
  BEFORE UPDATE ON organization_join_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 6. CREATE HELPER FUNCTION TO APPROVE JOIN REQUEST
-- ============================================================================

-- Function to approve a join request and add user to organization
CREATE OR REPLACE FUNCTION approve_join_request(
  p_request_id UUID,
  p_reviewer_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_organization_id UUID;
  v_user_id UUID;
  v_status TEXT;
BEGIN
  -- Get request details
  SELECT organization_id, user_id, status
  INTO v_organization_id, v_user_id, v_status
  FROM organization_join_requests
  WHERE id = p_request_id;

  -- Check if request exists and is pending
  IF NOT FOUND OR v_status != 'pending' THEN
    RETURN FALSE;
  END IF;

  -- Check if reviewer is admin/owner of the organization
  IF NOT EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_id = v_organization_id
    AND user_id = p_reviewer_id
    AND role IN ('Owner', 'Admin')
  ) THEN
    RETURN FALSE;
  END IF;

  -- Update request status
  UPDATE organization_join_requests
  SET 
    status = 'approved',
    reviewed_at = NOW(),
    reviewed_by = p_reviewer_id,
    updated_at = NOW()
  WHERE id = p_request_id;

  -- Add user to organization as Member
  INSERT INTO organization_members (organization_id, user_id, role)
  VALUES (v_organization_id, v_user_id, 'Member')
  ON CONFLICT (organization_id, user_id) DO NOTHING;

  RETURN TRUE;
END;
$$;

COMMENT ON FUNCTION approve_join_request IS 'Approves a join request and adds the user to the organization';

-- ============================================================================
-- 7. VERIFICATION QUERIES
-- ============================================================================

-- Uncomment these to verify the setup:

-- Check if table exists
-- SELECT table_name 
-- FROM information_schema.tables 
-- WHERE table_schema = 'public' 
-- AND table_name = 'organization_join_requests';

-- Check indexes
-- SELECT indexname 
-- FROM pg_indexes 
-- WHERE tablename = 'organization_join_requests';

-- Check RLS is enabled
-- SELECT tablename, rowsecurity 
-- FROM pg_tables 
-- WHERE tablename = 'organization_join_requests';

-- Check policies
-- SELECT schemaname, tablename, policyname, cmd 
-- FROM pg_policies 
-- WHERE tablename = 'organization_join_requests';

-- ============================================================================
-- SETUP COMPLETE
-- ============================================================================
-- The organization_join_requests table is now ready!

-- ============================================================================
-- 8. UPDATE ORGANIZATION_MEMBERS POLICIES TO ALLOW ADMINS
-- ============================================================================
-- The current policy only allows owners to insert members
-- We need to update it to allow both owners and admins

-- Drop and recreate the insert policy to allow admins
DROP POLICY IF EXISTS "insert_members_by_owner" ON organization_members;

CREATE POLICY "insert_members_by_owner_or_admin"
  ON organization_members
  FOR INSERT
  WITH CHECK (
    -- Allow if user is the owner of the organization
    EXISTS (
      SELECT 1 FROM organizations o
      WHERE o.id = organization_members.organization_id
      AND o.owner_user_id = auth.uid()
    )
    OR
    -- Allow if user is an admin of the organization
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = organization_members.organization_id
      AND om.user_id = auth.uid()
      AND om.role IN ('Owner', 'Admin')
    )
  );

COMMENT ON POLICY "insert_members_by_owner_or_admin" ON organization_members IS 'Allows organization owners and admins to add new members';

-- ============================================================================
-- FINAL VERIFICATION
-- ============================================================================

-- Verify updated policy
-- SELECT policyname, cmd 
-- FROM pg_policies 
-- WHERE tablename = 'organization_members' 
-- AND policyname = 'insert_members_by_owner_or_admin';

-- ============================================================================
-- Next steps:
-- 1. Implement API endpoints for creating/viewing/approving requests
-- 2. Update frontend to use join request workflow
-- ============================================================================
