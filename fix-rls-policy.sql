-- ============================================
-- FIX: Remove the problematic Admin policy
-- Run this in Supabase SQL Editor
-- ============================================

-- Drop the problematic policy that causes infinite recursion
DROP POLICY IF EXISTS "Admins can view all users" ON users;

-- Verify the remaining policies (should only show these 3)
SELECT policyname, cmd 
FROM pg_policies 
WHERE tablename = 'users';

-- Expected result:
-- 1. Users can view own profile (SELECT)
-- 2. Users can update own profile (UPDATE)
-- 3. Users can insert own profile (INSERT)
