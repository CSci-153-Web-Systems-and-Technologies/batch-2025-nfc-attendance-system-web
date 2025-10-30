-- ============================================================================
-- COMPREHENSIVE FIX: Remove ALL Recursive RLS Policies
-- ============================================================================
-- Date: October 29, 2025
-- Issue: Multiple SELECT policies with recursive queries cause infinite recursion
-- Solution: Drop ALL policies and recreate with simple, non-recursive ones
-- ============================================================================

BEGIN;

-- ============================================================================
-- STEP 1: Drop ALL existing policies on organization_members
-- ============================================================================

DROP POLICY IF EXISTS "Owners and Admins can remove members" ON organization_members;
DROP POLICY IF EXISTS "Users can leave organizations" ON organization_members;
DROP POLICY IF EXISTS "admins_can_remove_members" ON organization_members;

DROP POLICY IF EXISTS "Owners and Admins can add members" ON organization_members;
DROP POLICY IF EXISTS "admins_can_add_members" ON organization_members;

DROP POLICY IF EXISTS "Members can view organization memberships" ON organization_members;
DROP POLICY IF EXISTS "Users can view organization memberships they belong to" ON organization_members;
DROP POLICY IF EXISTS "Users can view their own memberships" ON organization_members;
DROP POLICY IF EXISTS "members_can_view_other_members" ON organization_members;

DROP POLICY IF EXISTS "Owners and Admins can update members" ON organization_members;
DROP POLICY IF EXISTS "admins_can_update_members" ON organization_members;

-- ============================================================================
-- STEP 2: Create simple, non-recursive policies
-- ============================================================================

-- SELECT: Users can only view their own membership records
-- (To view other members, the app will use a service role or make a separate query)
CREATE POLICY "select_own_memberships"
ON organization_members FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- INSERT: Only owners can add members (checked via owner_user_id in organizations table)
CREATE POLICY "insert_members_by_owner"
ON organization_members FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM organizations o
    WHERE o.id = organization_members.organization_id
    AND o.owner_user_id = auth.uid()
  )
);

-- UPDATE: Only owners can update member roles
CREATE POLICY "update_members_by_owner"
ON organization_members FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM organizations o
    WHERE o.id = organization_members.organization_id
    AND o.owner_user_id = auth.uid()
  )
);

-- DELETE: Owners can remove members, or users can remove themselves (except owners)
CREATE POLICY "delete_members"
ON organization_members FOR DELETE
TO authenticated
USING (
  -- User can leave (but not if they're the owner)
  (user_id = auth.uid() AND role <> 'Owner')
  OR
  -- Or the org owner can remove anyone
  EXISTS (
    SELECT 1 FROM organizations o
    WHERE o.id = organization_members.organization_id
    AND o.owner_user_id = auth.uid()
  )
);

COMMIT;

-- ============================================================================
-- VERIFICATION
-- ============================================================================
-- Run this to verify policies were created correctly:
-- SELECT policyname, cmd, qual FROM pg_policies 
-- WHERE tablename = 'organization_members' 
-- ORDER BY cmd, policyname;
