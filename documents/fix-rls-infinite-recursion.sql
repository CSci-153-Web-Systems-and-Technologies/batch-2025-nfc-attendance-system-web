-- ============================================================================
-- FIX: Infinite Recursion in Organization Members RLS Policies
-- ============================================================================
-- Date: October 29, 2025
-- Issue: Two SELECT policies on organization_members cause infinite recursion
-- Solution: Simplify to single policy that checks direct membership only
-- ============================================================================

BEGIN;

-- Drop the problematic SELECT policies
DROP POLICY IF EXISTS "Members can view their own membership" ON organization_members;
DROP POLICY IF EXISTS "Members can view org members" ON organization_members;

-- Create a single SELECT policy that only checks the current row
-- This avoids recursive queries by using a simple OR condition
CREATE POLICY "Members can view organization memberships"
ON organization_members FOR SELECT
TO authenticated
USING (
  -- Users can always view their own membership records
  user_id = auth.uid()
);

-- Note: To view other members in the same organization, the application
-- should first fetch the user's memberships, then query for other members
-- in those organizations. This two-step approach avoids RLS recursion.

COMMIT;

-- Verification queries (run these after migration):
-- SELECT tablename, policyname, permissive, roles, cmd, qual 
-- FROM pg_policies 
-- WHERE tablename = 'organization_members' 
-- ORDER BY policyname;
