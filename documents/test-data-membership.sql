-- ============================================================================
-- MEMBERSHIP FEATURE - TEST DATA
-- ============================================================================
-- This script creates sample membership data for testing
-- WARNING: Run this ONLY in development/testing environments
-- Make sure to replace UUIDs with actual IDs from your database
-- ============================================================================

-- ============================================================================
-- PREREQUISITES
-- ============================================================================
-- Before running this script, you need:
-- 1. At least 5 users in the users table
-- 2. At least 3 organizations in the organizations table
-- 3. Run setup-membership.sql first
-- ============================================================================

-- ============================================================================
-- STEP 1: Get existing User IDs and Organization IDs
-- ============================================================================
-- Run these queries first to get actual UUIDs from your database

/*
-- Get user IDs
SELECT id, name, email FROM users LIMIT 10;

-- Get organization IDs
SELECT id, name, owner_user_id FROM organizations LIMIT 10;
*/

-- ============================================================================
-- STEP 2: Set your actual UUIDs here
-- ============================================================================
-- Replace these example UUIDs with real ones from your database

-- Example User UUIDs (replace with actual values)
-- User 1 (Alice) - Will be owner of Org 1
-- User 2 (Bob) - Will be admin of Org 1, member of Org 2
-- User 3 (Charlie) - Will be attendance taker of Org 1
-- User 4 (Diana) - Will be member of multiple orgs
-- User 5 (Eve) - Will be owner of Org 2

-- Example Organization UUIDs (replace with actual values)
-- Org 1 - Faculty of Computing (FOC)
-- Org 2 - Computer Science Club (CSC)
-- Org 3 - Math Club

-- ============================================================================
-- STEP 3: Insert Sample Memberships
-- ============================================================================
-- Replace the UUIDs below with actual UUIDs from your database

-- Example memberships (DO NOT RUN AS-IS, replace UUIDs first!)
/*
-- Faculty of Computing (FOC) Members
INSERT INTO organization_members (user_id, organization_id, role)
VALUES 
  -- Alice as Owner
  ('alice-user-uuid', 'foc-org-uuid', 'Owner'),
  -- Bob as Admin
  ('bob-user-uuid', 'foc-org-uuid', 'Admin'),
  -- Charlie as Attendance Taker
  ('charlie-user-uuid', 'foc-org-uuid', 'Attendance Taker'),
  -- Diana as Member
  ('diana-user-uuid', 'foc-org-uuid', 'Member')
ON CONFLICT (user_id, organization_id) DO NOTHING;

-- Computer Science Club (CSC) Members
INSERT INTO organization_members (user_id, organization_id, role)
VALUES 
  -- Eve as Owner
  ('eve-user-uuid', 'csc-org-uuid', 'Owner'),
  -- Bob as Member (also in FOC)
  ('bob-user-uuid', 'csc-org-uuid', 'Member'),
  -- Diana as Admin
  ('diana-user-uuid', 'csc-org-uuid', 'Admin')
ON CONFLICT (user_id, organization_id) DO NOTHING;

-- Math Club Members
INSERT INTO organization_members (user_id, organization_id, role)
VALUES 
  -- Diana as Owner
  ('diana-user-uuid', 'math-org-uuid', 'Owner'),
  -- Charlie as Member
  ('charlie-user-uuid', 'math-org-uuid', 'Member')
ON CONFLICT (user_id, organization_id) DO NOTHING;
*/

-- ============================================================================
-- AUTOMATED TEST DATA GENERATION (Advanced)
-- ============================================================================
-- This section can automatically create test data using existing users/orgs
-- Uncomment and customize as needed

/*
-- Create a temporary function to add test memberships
CREATE OR REPLACE FUNCTION create_test_memberships()
RETURNS void AS $$
DECLARE
  v_users UUID[];
  v_orgs UUID[];
  v_user_id UUID;
  v_org_id UUID;
  v_roles TEXT[] := ARRAY['Admin', 'Attendance Taker', 'Member'];
  v_role TEXT;
  i INTEGER;
BEGIN
  -- Get first 10 users (excluding those who are already owners)
  SELECT ARRAY_AGG(id) INTO v_users
  FROM (
    SELECT u.id 
    FROM users u
    WHERE NOT EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.user_id = u.id AND om.role = 'Owner'
    )
    LIMIT 10
  ) subquery;

  -- Get first 5 organizations
  SELECT ARRAY_AGG(id) INTO v_orgs
  FROM (
    SELECT id FROM organizations LIMIT 5
  ) subquery;

  -- Add random memberships
  FOR i IN 1..ARRAY_LENGTH(v_users, 1) LOOP
    v_user_id := v_users[i];
    
    -- Add user to 1-3 random organizations
    FOR j IN 1..(1 + FLOOR(RANDOM() * 3)::INTEGER) LOOP
      v_org_id := v_orgs[1 + FLOOR(RANDOM() * ARRAY_LENGTH(v_orgs, 1))::INTEGER];
      v_role := v_roles[1 + FLOOR(RANDOM() * ARRAY_LENGTH(v_roles, 1))::INTEGER];
      
      -- Try to insert (will skip if already exists due to unique constraint)
      BEGIN
        INSERT INTO organization_members (user_id, organization_id, role)
        VALUES (v_user_id, v_org_id, v_role)
        ON CONFLICT (user_id, organization_id) DO NOTHING;
      EXCEPTION WHEN OTHERS THEN
        -- Skip if error (e.g., RLS policy violation)
        NULL;
      END;
    END LOOP;
  END LOOP;

  RAISE NOTICE 'Test memberships created successfully';
END;
$$ LANGUAGE plpgsql;

-- Run the function to create test data
SELECT create_test_memberships();

-- Clean up
DROP FUNCTION create_test_memberships();
*/

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================
-- Run these to verify the test data was created correctly

-- Count total memberships
SELECT COUNT(*) as total_memberships FROM organization_members;

-- Count memberships by role
SELECT 
  role,
  COUNT(*) as count
FROM organization_members
GROUP BY role
ORDER BY 
  CASE role
    WHEN 'Owner' THEN 1
    WHEN 'Admin' THEN 2
    WHEN 'Attendance Taker' THEN 3
    WHEN 'Member' THEN 4
  END;

-- Show memberships with organization names
SELECT 
  u.name as user_name,
  u.email,
  om.role,
  o.name as organization_name,
  om.joined_at
FROM organization_members om
JOIN users u ON om.user_id = u.id
JOIN organizations o ON om.organization_id = o.id
ORDER BY o.name, 
  CASE om.role
    WHEN 'Owner' THEN 1
    WHEN 'Admin' THEN 2
    WHEN 'Attendance Taker' THEN 3
    WHEN 'Member' THEN 4
  END;

-- Show organizations with member counts
SELECT 
  o.name as organization_name,
  o.description,
  COUNT(om.id) as member_count,
  COUNT(CASE WHEN om.role = 'Owner' THEN 1 END) as owners,
  COUNT(CASE WHEN om.role = 'Admin' THEN 1 END) as admins,
  COUNT(CASE WHEN om.role = 'Attendance Taker' THEN 1 END) as attendance_takers,
  COUNT(CASE WHEN om.role = 'Member' THEN 1 END) as members
FROM organizations o
LEFT JOIN organization_members om ON o.id = om.organization_id
GROUP BY o.id, o.name, o.description
ORDER BY member_count DESC;

-- Show users with their memberships (membership tags)
SELECT 
  u.name as user_name,
  u.email,
  STRING_AGG(o.name || ':' || om.role, ', ' ORDER BY o.name) as membership_tags,
  COUNT(om.id) as organization_count
FROM users u
LEFT JOIN organization_members om ON u.id = om.user_id
LEFT JOIN organizations o ON om.organization_id = o.id
GROUP BY u.id, u.name, u.email
HAVING COUNT(om.id) > 0
ORDER BY organization_count DESC, u.name;

-- Check for users in multiple organizations
SELECT 
  u.name as user_name,
  u.email,
  COUNT(om.id) as membership_count
FROM users u
JOIN organization_members om ON u.id = om.user_id
GROUP BY u.id, u.name, u.email
HAVING COUNT(om.id) > 1
ORDER BY membership_count DESC;

-- Check for organizations with multiple owners (should be 0)
SELECT 
  o.name as organization_name,
  COUNT(CASE WHEN om.role = 'Owner' THEN 1 END) as owner_count
FROM organizations o
LEFT JOIN organization_members om ON o.id = om.organization_id
GROUP BY o.id, o.name
HAVING COUNT(CASE WHEN om.role = 'Owner' THEN 1 END) > 1;

-- ============================================================================
-- SAMPLE QUERIES FOR TESTING FEATURES
-- ============================================================================

-- Test 1: Get all memberships for a specific user
/*
SELECT 
  om.*,
  o.name as organization_name
FROM organization_members om
JOIN organizations o ON om.organization_id = o.id
WHERE om.user_id = 'your-user-uuid';
*/

-- Test 2: Get all members of a specific organization
/*
SELECT 
  om.*,
  u.name as user_name,
  u.email
FROM organization_members om
JOIN users u ON om.user_id = u.id
WHERE om.organization_id = 'your-org-uuid'
ORDER BY 
  CASE om.role
    WHEN 'Owner' THEN 1
    WHEN 'Admin' THEN 2
    WHEN 'Attendance Taker' THEN 3
    WHEN 'Member' THEN 4
  END;
*/

-- Test 3: Check if a user has admin permission in an organization
/*
SELECT user_has_permission(
  'your-user-uuid',
  'your-org-uuid',
  'Admin'
) as has_admin_permission;
*/

-- Test 4: Get membership tags for a user
/*
SELECT 
  o.name as organization_name,
  om.role,
  o.name || ':' || om.role as tag
FROM organization_members om
JOIN organizations o ON om.organization_id = o.id
WHERE om.user_id = 'your-user-uuid'
ORDER BY o.name;
*/

-- ============================================================================
-- CLEANUP (Use with caution!)
-- ============================================================================
-- Uncomment to remove all test memberships
-- WARNING: This will delete ALL memberships except Owners

/*
-- Delete all non-owner memberships
DELETE FROM organization_members
WHERE role != 'Owner';

-- Or delete ALL memberships (including owners)
-- DELETE FROM organization_members;
*/

-- ============================================================================
-- TEST DATA CREATION COMPLETE
-- ============================================================================
-- Next steps:
-- 1. Replace example UUIDs with actual values from your database
-- 2. Run the INSERT statements
-- 3. Verify data with the verification queries
-- 4. Test the API endpoints with this data
-- ============================================================================
