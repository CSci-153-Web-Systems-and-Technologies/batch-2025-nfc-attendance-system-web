-- ============================================================================
-- DATABASE CLEANUP AND FIX SCRIPT FOR SUPABASE
-- ============================================================================
-- This script fixes duplicate constraints, indexes, triggers, and policies
-- 
-- INSTRUCTIONS:
-- 1. Go to Supabase Dashboard → SQL Editor
-- 2. Copy and paste this ENTIRE script
-- 3. Click "Run" to execute
-- 4. Review the output messages
-- 5. Scroll down to verification queries to confirm changes
-- ============================================================================
-- ⚠️ IMPORTANT: This script is safe to run multiple times (uses IF EXISTS)
-- ============================================================================

-- ============================================================================
-- 1. REMOVE DUPLICATE INDEXES ON organization_members
-- ============================================================================
-- Keep the newer naming convention (idx_organization_members_*)
-- Remove the older ones (idx_org_members_*)

DROP INDEX IF EXISTS idx_org_members_joined_at;
DROP INDEX IF EXISTS idx_org_members_org_id;
DROP INDEX IF EXISTS idx_org_members_role;
DROP INDEX IF EXISTS idx_org_members_user_id;

-- Verify remaining indexes
-- SELECT indexname FROM pg_indexes WHERE tablename = 'organization_members';

-- ============================================================================
-- 2. REMOVE DUPLICATE TRIGGERS ON organization_members
-- ============================================================================

-- Remove the older trigger name
DROP TRIGGER IF EXISTS update_org_members_updated_at ON organization_members;

-- Keep: update_organization_members_updated_at

-- Remove duplicate owner check trigger
DROP TRIGGER IF EXISTS check_single_owner_trigger ON organization_members;

-- Keep: enforce_single_owner

-- ============================================================================
-- 3. REMOVE DUPLICATE RLS POLICIES
-- ============================================================================
-- ⚠️ NOTE: In Supabase, if you get "policy does not exist" errors, that's OK!
-- It just means the policy wasn't duplicated in your specific setup.

-- ORGANIZATION_MEMBERS - Remove older policy versions (keep function-based ones)
DROP POLICY IF EXISTS "Admins and Owners can add members" ON organization_members;
DROP POLICY IF EXISTS "Admins and Owners can remove members" ON organization_members;
DROP POLICY IF EXISTS "Admins and Owners can update memberships" ON organization_members;
DROP POLICY IF EXISTS "Members can view members in their organizations" ON organization_members;

-- Keep the function-based policies:
-- admins_can_add_members
-- admins_can_remove_members
-- admins_can_update_members
-- members_can_view_other_members

-- Also keep the specific user policies:
-- Users can leave organizations
-- Users can view their own memberships
-- Users can view organization memberships they belong to

-- EVENTS - Remove duplicate policies
DROP POLICY IF EXISTS "Authorized members can create events" ON events;
DROP POLICY IF EXISTS "Authorized members can update events" ON events;
DROP POLICY IF EXISTS "Members can view organization events" ON events;
DROP POLICY IF EXISTS "Owners and Admins can delete events" ON events;

-- Keep the function-based policies:
-- members_can_create_events
-- members_can_view_events
-- creators_and_admins_can_update_events
-- creators_and_admins_can_delete_events

-- ORGANIZATIONS - Remove duplicate policies
DROP POLICY IF EXISTS "Members can view their organizations" ON organizations;
DROP POLICY IF EXISTS "Owners and Admins can update organizations" ON organizations;
DROP POLICY IF EXISTS "Owners can delete organizations" ON organizations;

-- Keep the function-based policies:
-- members_can_view_organizations
-- admins_can_update_organizations
-- owners_can_delete_organizations
-- Authenticated users can create organizations (keep this one)

-- ============================================================================
-- 4. VERIFY NO DUPLICATE FOREIGN KEYS
-- ============================================================================
-- Check if there are actually duplicate constraints in the database
-- (The export might have just shown the same constraint multiple times)

SELECT 
  conname AS constraint_name,
  conrelid::regclass AS table_name,
  confrelid::regclass AS referenced_table,
  COUNT(*) as count
FROM pg_constraint
WHERE contype = 'f'
  AND connamespace = 'public'::regnamespace
GROUP BY conname, conrelid, confrelid
HAVING COUNT(*) > 1;

-- If any results appear, those need to be investigated
-- (This is unlikely - probably just a display issue in the export)

-- ============================================================================
-- 5. VERIFICATION QUERIES
-- ============================================================================
-- 🔍 Run these to verify the cleanup worked
-- Copy and run each query separately to see results

-- ===== CHECK 1: Remaining indexes on organization_members =====
-- Expected: ~7 indexes (down from 11)
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'organization_members'
ORDER BY indexname;

-- ===== CHECK 2: Remaining triggers =====
-- Expected: 2 triggers on organization_members (down from 4)
SELECT trigger_name, event_manipulation, action_statement
FROM information_schema.triggers
WHERE event_object_table IN ('organization_members', 'organizations', 'events', 'users')
ORDER BY event_object_table, trigger_name;

-- ===== CHECK 3: Remaining RLS policies =====
-- Expected: Fewer duplicate policies
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- ===== CHECK 4: Check for any remaining duplicate constraints =====
-- Expected: 0 rows (no duplicates)
SELECT 
  conname,
  conrelid::regclass AS table_name,
  COUNT(*) as occurrences
FROM pg_constraint
WHERE connamespace = 'public'::regnamespace
GROUP BY conname, conrelid
HAVING COUNT(*) > 1;

-- ============================================================================
-- 6. TEST YOUR ORGANIZATION FEATURE
-- ============================================================================
-- After cleanup, test these operations in your app:
-- ✅ 1. Create a new organization
-- ✅ 2. View organizations page
-- ✅ 3. Add members to organization
-- ✅ 4. Create events
-- ✅ 5. Update organization details
--
-- All should work faster and more efficiently now!
-- ============================================================================

-- ============================================================================
-- 6. EXPECTED RESULT SUMMARY
-- ============================================================================
/*
After running this cleanup:

organization_members should have:
- 7 indexes (down from 11)
- 2 triggers (down from 4)
- 7 RLS policies (down from 14)

events should have:
- 7 indexes (unchanged)
- 1 trigger (unchanged)
- 4 RLS policies (down from 8)

organizations should have:
- 4 indexes (unchanged)
- 1 trigger (unchanged)
- 4 RLS policies (down from 7)

This will:
✅ Reduce disk space usage
✅ Improve write performance
✅ Simplify maintenance
✅ Clarify security model
✅ Remove confusion
*/

-- ============================================================================
-- NOTES FOR SUPABASE
-- ============================================================================
/*
✅ SAFE TO RUN: This script uses IF EXISTS, so it won't break anything
✅ IDEMPOTENT: You can run it multiple times safely
✅ NO DATA LOSS: Only removes duplicate metadata, not your data

WHAT TO EXPECT WHEN RUNNING:
- Some DROP commands may show "does not exist" - that's normal!
- You might see "NOTICE" messages - those are just informational
- Look for "DROP INDEX", "DROP TRIGGER", "DROP POLICY" success messages

AFTER RUNNING:
1. Run the verification queries (Section 5) to confirm cleanup
2. Test your organization features in the app
3. Check Supabase logs if anything seems off

IF YOU ENCOUNTER ERRORS:
- "must be owner of..." → Make sure you're using the Supabase SQL Editor (not psql)
- "relation does not exist" → That's fine, it means it wasn't duplicated
- Other errors → Share them with me and I'll help resolve

PERFORMANCE IMPROVEMENTS:
- Faster INSERT/UPDATE on organization_members
- Less disk space usage
- Simpler security policy evaluation
- Clearer codebase for future development
*/
