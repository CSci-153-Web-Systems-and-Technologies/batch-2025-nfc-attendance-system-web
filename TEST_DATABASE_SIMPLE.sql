-- ============================================================================
-- SIMPLE DATABASE TESTING SCRIPT
-- Tests database after restoration - NO MANUAL UUID REPLACEMENT NEEDED
-- ============================================================================
-- Run these queries one by one in Supabase SQL Editor
-- Make sure you're logged in (RLS enabled)
-- ============================================================================

-- ============================================================================
-- TEST 1: Check Your Authentication
-- ============================================================================
SELECT 
  '=== TEST 1: Your Auth Info ===' as test_name,
  auth.uid() as your_auth_id,
  auth.email() as your_email;

-- ============================================================================
-- TEST 2: Check Your User Profile
-- ============================================================================
SELECT 
  '=== TEST 2: Your Profile ===' as test_name,
  id as user_id,
  auth_id,
  name,
  email,
  user_type,
  created_at
FROM users
WHERE auth_id = auth.uid();

-- If TEST 2 returns no rows, run this to create your profile:
-- ============================================================================
-- TEST 2B: Create Your Profile (Only if TEST 2 was empty)
-- ============================================================================
-- Uncomment and run this if you don't have a profile yet:
/*
INSERT INTO users (auth_id, name, email, user_type)
VALUES (
  auth.uid(),
  'Test User',
  auth.email(),
  'Student'
)
RETURNING 
  '=== Profile Created ===' as result,
  id,
  name,
  email,
  user_type;
*/

-- ============================================================================
-- TEST 3: Create Test Organization
-- ============================================================================
INSERT INTO organizations (name, description, owner_user_id)
VALUES (
  'My Test Organization ' || NOW()::TEXT,
  'Testing database restoration at commit 9f606ae',
  (SELECT id FROM users WHERE auth_id = auth.uid())
)
RETURNING 
  '=== TEST 3: Organization Created ===' as result,
  id as org_id,
  name,
  description,
  owner_user_id,
  created_at;

-- ============================================================================
-- TEST 4: View Your Organizations
-- ============================================================================
SELECT 
  '=== TEST 4: My Organizations ===' as test_name,
  o.id as org_id,
  o.name,
  o.description,
  u.name as owner_name,
  o.created_at
FROM organizations o
JOIN users u ON o.owner_user_id = u.id
WHERE u.auth_id = auth.uid()
ORDER BY o.created_at DESC;

-- ============================================================================
-- TEST 5: Add Yourself as Owner in organization_members
-- ============================================================================
-- This uses the most recent organization you own
INSERT INTO organization_members (organization_id, user_id, role)
SELECT 
  o.id,
  u.id,
  'Owner'
FROM organizations o
JOIN users u ON o.owner_user_id = u.id
WHERE u.auth_id = auth.uid()
ORDER BY o.created_at DESC
LIMIT 1
RETURNING 
  '=== TEST 5: Added as Owner ===' as result,
  id as membership_id,
  organization_id,
  user_id,
  role,
  joined_at;

-- ============================================================================
-- TEST 6: View Organization Members
-- ============================================================================
SELECT 
  '=== TEST 6: Organization Members ===' as test_name,
  o.name as organization_name,
  u.name as member_name,
  u.email as member_email,
  om.role,
  om.joined_at
FROM organization_members om
JOIN organizations o ON om.organization_id = o.id
JOIN users u ON om.user_id = u.id
WHERE o.owner_user_id = (SELECT id FROM users WHERE auth_id = auth.uid())
ORDER BY om.joined_at DESC;

-- ============================================================================
-- TEST 7: Test Security Definer Functions
-- ============================================================================
-- Test with your most recent organization
WITH my_org AS (
  SELECT o.id as org_id
  FROM organizations o
  JOIN users u ON o.owner_user_id = u.id
  WHERE u.auth_id = auth.uid()
  ORDER BY o.created_at DESC
  LIMIT 1
)
SELECT 
  '=== TEST 7: Function Tests ===' as test_name,
  is_org_member(mo.org_id, auth.uid()) as am_i_member,
  is_org_admin(mo.org_id, auth.uid()) as am_i_admin,
  is_org_owner(mo.org_id, auth.uid()) as am_i_owner
FROM my_org mo;

-- ============================================================================
-- TEST 8: Test Helper Functions
-- ============================================================================
WITH my_data AS (
  SELECT 
    u.id as user_id,
    o.id as org_id
  FROM users u
  CROSS JOIN LATERAL (
    SELECT id
    FROM organizations
    WHERE owner_user_id = u.id
    ORDER BY created_at DESC
    LIMIT 1
  ) o
  WHERE u.auth_id = auth.uid()
)
SELECT 
  '=== TEST 8: Helper Functions ===' as test_name,
  get_organization_member_count(md.org_id) as member_count,
  get_user_membership_count(md.user_id) as my_membership_count,
  get_user_role_in_organization(md.user_id, md.org_id) as my_role,
  user_has_permission(md.user_id, md.org_id, 'Admin') as has_admin_permission,
  user_has_role(md.user_id, md.org_id, 'Owner') as is_owner_role
FROM my_data md;

-- ============================================================================
-- TEST 9: Create Test Event
-- ============================================================================
WITH my_org AS (
  SELECT o.id as org_id
  FROM organizations o
  JOIN users u ON o.owner_user_id = u.id
  WHERE u.auth_id = auth.uid()
  ORDER BY o.created_at DESC
  LIMIT 1
)
INSERT INTO events (
  event_name,
  date,
  organization_id,
  description,
  location,
  created_by
)
SELECT 
  'Test Event ' || NOW()::TEXT,
  NOW() + INTERVAL '7 days',
  mo.org_id,
  'Testing event creation after database restoration',
  'Test Location',
  (SELECT id FROM users WHERE auth_id = auth.uid())
FROM my_org mo
RETURNING 
  '=== TEST 9: Event Created ===' as result,
  id as event_id,
  event_name,
  date,
  organization_id,
  location,
  created_at;

-- ============================================================================
-- TEST 10: View Your Events
-- ============================================================================
SELECT 
  '=== TEST 10: My Events ===' as test_name,
  e.event_name,
  e.date,
  e.location,
  o.name as organization_name,
  u.name as created_by_name,
  e.created_at
FROM events e
JOIN organizations o ON e.organization_id = o.id
JOIN users u ON e.created_by = u.id
WHERE e.created_by = (SELECT id FROM users WHERE auth_id = auth.uid())
ORDER BY e.date DESC;

-- ============================================================================
-- TEST 11: Test RLS Isolation (Should Return 0)
-- ============================================================================
SELECT 
  '=== TEST 11: RLS Protection ===' as test_name,
  COUNT(*) as other_users_visible
FROM users
WHERE auth_id != auth.uid();
-- Expected: 0 (you can't see other users' data)

-- ============================================================================
-- TEST 12: Test Update Trigger
-- ============================================================================
-- Update your most recent organization
WITH my_org AS (
  SELECT o.id
  FROM organizations o
  JOIN users u ON o.owner_user_id = u.id
  WHERE u.auth_id = auth.uid()
  ORDER BY o.created_at DESC
  LIMIT 1
)
UPDATE organizations
SET description = 'Updated description to test trigger - ' || NOW()::TEXT
WHERE id = (SELECT id FROM my_org)
RETURNING 
  '=== TEST 12: Update Trigger ===' as result,
  id,
  name,
  description,
  updated_at,
  created_at,
  (updated_at > created_at) as trigger_worked;

-- ============================================================================
-- TEST 13: Verify Complete Setup
-- ============================================================================
SELECT 
  '=== TEST 13: Setup Summary ===' as test_name,
  (SELECT COUNT(*) FROM information_schema.tables 
   WHERE table_schema = 'public' 
   AND table_name IN ('users', 'organizations', 'organization_members', 'events')) as tables_count,
  (SELECT COUNT(*) FROM pg_policies 
   WHERE schemaname = 'public') as total_policies,
  (SELECT COUNT(*) FROM pg_proc p
   JOIN pg_namespace n ON p.pronamespace = n.oid
   WHERE n.nspname = 'public'
   AND p.proname IN ('is_org_member', 'is_org_admin', 'is_org_owner',
                     'get_organization_member_count', 'get_user_membership_count',
                     'get_user_role_in_organization', 'user_has_permission', 'user_has_role')) as custom_functions;

-- ============================================================================
-- TEST 14: Test Single Owner Constraint
-- ============================================================================
-- This should FAIL with an error message (proving constraint works)
-- Uncomment to test:
/*
WITH my_org AS (
  SELECT o.id as org_id
  FROM organizations o
  JOIN users u ON o.owner_user_id = u.id
  WHERE u.auth_id = auth.uid()
  ORDER BY o.created_at DESC
  LIMIT 1
)
INSERT INTO organization_members (organization_id, user_id, role)
SELECT 
  mo.org_id,
  gen_random_uuid(), -- Random user (will fail)
  'Owner'
FROM my_org mo;
-- Expected: ERROR - "Organization can only have one owner"
*/

-- ============================================================================
-- TEST 15: View All Active Policies
-- ============================================================================
SELECT 
  '=== TEST 15: RLS Policies ===' as test_name,
  tablename,
  policyname,
  permissive,
  cmd as operation
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('users', 'organizations', 'organization_members', 'events')
ORDER BY tablename, policyname;

-- ============================================================================
-- RESULTS SUMMARY
-- ============================================================================
SELECT 
  '=== FINAL SUMMARY ===' as section,
  'Check results above' as instruction,
  'Expected: All tests pass without permission denied errors' as expectation;

-- ============================================================================
-- CLEANUP (Optional - Uncomment to delete test data)
-- ============================================================================
/*
-- Delete test events
DELETE FROM events 
WHERE created_by = (SELECT id FROM users WHERE auth_id = auth.uid())
AND event_name LIKE 'Test Event%';

-- Delete test organization members
DELETE FROM organization_members
WHERE organization_id IN (
  SELECT o.id 
  FROM organizations o
  JOIN users u ON o.owner_user_id = u.id
  WHERE u.auth_id = auth.uid()
);

-- Delete test organizations
DELETE FROM organizations
WHERE owner_user_id = (SELECT id FROM users WHERE auth_id = auth.uid())
AND name LIKE 'My Test Organization%';

SELECT '=== Cleanup Complete ===' as result;
*/
