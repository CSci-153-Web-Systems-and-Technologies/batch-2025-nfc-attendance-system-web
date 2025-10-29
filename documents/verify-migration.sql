-- ============================================================================
-- VERIFICATION QUERIES FOR USER ID MIGRATION
-- ============================================================================
-- Run these queries to verify the migration was successful
-- ============================================================================

-- 1. Check users table structure (should show new columns)
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'users'
ORDER BY ordinal_position;

-- Expected columns:
-- id (uuid, not nullable) - this was formerly auth_id
-- name (text)
-- email (text)
-- user_type (text)
-- auth_provider (text) - NEW
-- has_password (boolean) - NEW
-- nfc_tag_id (text, nullable)
-- qr_code_data (text, nullable)
-- created_at (timestamp)
-- updated_at (timestamp)

-- ============================================================================

-- 2. Verify all users have valid auth_provider values
SELECT 
  auth_provider, 
  has_password, 
  COUNT(*) as user_count
FROM users
GROUP BY auth_provider, has_password
ORDER BY auth_provider, has_password;

-- Expected: Should show counts of users by provider type

-- ============================================================================

-- 3. Verify all foreign keys are working
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

-- Expected: Should show counts without errors

-- ============================================================================

-- 4. Check primary key constraint on users
SELECT
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  tc.constraint_type
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
WHERE tc.table_name = 'users'
  AND tc.constraint_type = 'PRIMARY KEY';

-- Expected: Should show 'id' as primary key (not auth_id)

-- ============================================================================

-- 5. Check foreign key constraints
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
  AND ccu.table_name = 'users';

-- Expected: Should show fk_owner_user, fk_user, fk_created_by_user all referencing users(id)

-- ============================================================================

-- 6. Verify views were recreated
SELECT 
  table_name,
  view_definition
FROM information_schema.views
WHERE table_name IN ('membership_with_user', 'membership_with_organization')
ORDER BY table_name;

-- Expected: Both views should exist

-- ============================================================================

-- 7. Test the views work correctly
SELECT COUNT(*) as membership_with_user_count
FROM membership_with_user;

SELECT COUNT(*) as membership_with_organization_count
FROM membership_with_organization;

-- Expected: Should return counts without errors

-- ============================================================================

-- 8. Check RLS policies exist
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename IN ('users', 'organizations', 'organization_members', 'events')
ORDER BY tablename, policyname;

-- Expected: Should show all recreated policies

-- ============================================================================

-- 9. Verify indexes exist
SELECT
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'users'
ORDER BY indexname;

-- Expected: Should show indexes including idx_users_email, idx_users_auth_provider

-- ============================================================================

-- 10. Test that auth.uid() matches users.id for a sample query
-- This query simulates what happens when a logged-in user queries their profile
-- Replace 'your-auth-user-id-here' with an actual auth user ID from your auth.users table
/*
SELECT 
  id,
  name,
  email,
  auth_provider,
  has_password
FROM users
WHERE id = 'your-auth-user-id-here';
*/

-- Expected: Should return the user if the ID exists

-- ============================================================================

-- SUMMARY QUERY: Everything at a glance
SELECT 
  'Users Table' as check_item,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'auth_provider'
    ) THEN '✅ PASS'
    ELSE '❌ FAIL'
  END as status,
  'auth_provider column exists' as details
UNION ALL
SELECT 
  'Users Table',
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'has_password'
    ) THEN '✅ PASS'
    ELSE '❌ FAIL'
  END,
  'has_password column exists'
UNION ALL
SELECT 
  'Users Table',
  CASE 
    WHEN NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'auth_id'
    ) THEN '✅ PASS'
    ELSE '❌ FAIL'
  END,
  'auth_id column removed (now just id)'
UNION ALL
SELECT 
  'Primary Key',
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
      WHERE tc.table_name = 'users'
        AND tc.constraint_type = 'PRIMARY KEY'
        AND kcu.column_name = 'id'
    ) THEN '✅ PASS'
    ELSE '❌ FAIL'
  END,
  'id is primary key'
UNION ALL
SELECT 
  'Views',
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.views 
      WHERE table_name = 'membership_with_user'
    ) THEN '✅ PASS'
    ELSE '❌ FAIL'
  END,
  'membership_with_user exists'
UNION ALL
SELECT 
  'Views',
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.views 
      WHERE table_name = 'membership_with_organization'
    ) THEN '✅ PASS'
    ELSE '❌ FAIL'
  END,
  'membership_with_organization exists'
UNION ALL
SELECT 
  'Foreign Keys',
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE constraint_name = 'fk_owner_user'
        AND table_name = 'organizations'
    ) THEN '✅ PASS'
    ELSE '❌ FAIL'
  END,
  'organizations.owner_user_id FK exists'
UNION ALL
SELECT 
  'Foreign Keys',
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE constraint_name = 'fk_user'
        AND table_name = 'organization_members'
    ) THEN '✅ PASS'
    ELSE '❌ FAIL'
  END,
  'organization_members.user_id FK exists'
UNION ALL
SELECT 
  'Foreign Keys',
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE constraint_name = 'fk_created_by_user'
        AND table_name = 'events'
    ) THEN '✅ PASS'
    ELSE '❌ FAIL'
  END,
  'events.created_by FK exists';
