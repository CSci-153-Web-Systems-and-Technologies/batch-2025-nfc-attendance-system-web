-- ============================================================================
-- COMPREHENSIVE DATABASE STRUCTURE EXPORT
-- ============================================================================
-- Run these queries IN ORDER in your Supabase SQL Editor
-- Copy and paste the results to share with me for a complete database view
-- ============================================================================

-- ============================================================================
-- QUERY 1: List All Tables
-- ============================================================================
-- This shows all tables in your public schema
-- COPY THE OUTPUT AND SHARE IT

SELECT 
  table_name,
  table_type
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

-- ============================================================================
-- QUERY 2: Get Complete Table Structures with Columns
-- ============================================================================
-- This shows all columns for each table with their data types and constraints
-- COPY THE OUTPUT AND SHARE IT

SELECT 
  t.table_name,
  c.column_name,
  c.data_type,
  c.character_maximum_length,
  c.is_nullable,
  c.column_default,
  c.ordinal_position
FROM information_schema.tables t
JOIN information_schema.columns c 
  ON t.table_name = c.table_name
WHERE t.table_schema = 'public'
  AND t.table_type = 'BASE TABLE'
ORDER BY t.table_name, c.ordinal_position;

-- ============================================================================
-- QUERY 3: Get All Foreign Key Relationships
-- ============================================================================
-- This shows how tables are related to each other
-- COPY THE OUTPUT AND SHARE IT

SELECT
  tc.table_name AS from_table,
  kcu.column_name AS from_column,
  ccu.table_name AS to_table,
  ccu.column_name AS to_column,
  tc.constraint_name,
  rc.update_rule,
  rc.delete_rule
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
JOIN information_schema.referential_constraints AS rc
  ON rc.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
ORDER BY tc.table_name, kcu.column_name;

-- ============================================================================
-- QUERY 4: Get All Unique Constraints
-- ============================================================================
-- This shows unique constraints on tables
-- COPY THE OUTPUT AND SHARE IT

SELECT
  tc.table_name,
  tc.constraint_name,
  tc.constraint_type,
  string_agg(kcu.column_name, ', ' ORDER BY kcu.ordinal_position) AS columns
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
WHERE tc.constraint_type IN ('UNIQUE', 'PRIMARY KEY')
  AND tc.table_schema = 'public'
GROUP BY tc.table_name, tc.constraint_name, tc.constraint_type
ORDER BY tc.table_name, tc.constraint_type;

-- ============================================================================
-- QUERY 5: Get All Check Constraints
-- ============================================================================
-- This shows validation rules on columns (like role enums)
-- COPY THE OUTPUT AND SHARE IT

SELECT
  tc.table_name,
  tc.constraint_name,
  cc.check_clause
FROM information_schema.table_constraints AS tc
JOIN information_schema.check_constraints AS cc
  ON tc.constraint_name = cc.constraint_name
WHERE tc.constraint_type = 'CHECK'
  AND tc.table_schema = 'public'
ORDER BY tc.table_name;

-- ============================================================================
-- QUERY 6: Get All Indexes
-- ============================================================================
-- This shows all indexes for performance optimization
-- COPY THE OUTPUT AND SHARE IT

SELECT
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- ============================================================================
-- QUERY 7: Get RLS (Row Level Security) Status
-- ============================================================================
-- This shows which tables have RLS enabled
-- COPY THE OUTPUT AND SHARE IT

SELECT
  schemaname,
  tablename,
  rowsecurity AS rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- ============================================================================
-- QUERY 8: Get All RLS Policies
-- ============================================================================
-- This shows all security policies on tables
-- COPY THE OUTPUT AND SHARE IT

SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd AS operation,
  qual AS using_expression,
  with_check AS with_check_expression
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- ============================================================================
-- QUERY 9: Get All Triggers
-- ============================================================================
-- This shows all triggers (like auto-update timestamps)
-- COPY THE OUTPUT AND SHARE IT

SELECT
  trigger_schema,
  trigger_name,
  event_manipulation AS event,
  event_object_table AS table_name,
  action_statement,
  action_timing
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;

-- ============================================================================
-- QUERY 10: Get All Functions/Procedures
-- ============================================================================
-- This shows custom database functions
-- COPY THE OUTPUT AND SHARE IT

SELECT
  n.nspname AS schema,
  p.proname AS function_name,
  pg_get_function_result(p.oid) AS return_type,
  pg_get_function_arguments(p.oid) AS arguments,
  CASE p.prokind
    WHEN 'f' THEN 'function'
    WHEN 'p' THEN 'procedure'
    WHEN 'a' THEN 'aggregate'
    WHEN 'w' THEN 'window'
  END AS function_type
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
ORDER BY p.proname;

-- ============================================================================
-- QUERY 11: Get Row Counts for Each Table
-- ============================================================================
-- This shows how much data is in each table
-- COPY THE OUTPUT AND SHARE IT

SELECT
  schemaname,
  relname AS table_name,
  n_live_tup AS row_count
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY n_live_tup DESC;

-- ============================================================================
-- QUERY 12: Get Enum Types (if any)
-- ============================================================================
-- This shows custom enum types
-- COPY THE OUTPUT AND SHARE IT

SELECT
  t.typname AS enum_name,
  string_agg(e.enumlabel, ', ' ORDER BY e.enumsortorder) AS enum_values
FROM pg_type t
JOIN pg_enum e ON t.oid = e.enumtypid
JOIN pg_namespace n ON t.typnamespace = n.oid
WHERE n.nspname = 'public'
GROUP BY t.typname
ORDER BY t.typname;

-- ============================================================================
-- QUERY 13: Sample Data from Key Tables (OPTIONAL)
-- ============================================================================
-- Uncomment these if you want to share sample data structure
-- DO NOT share actual user data if it contains sensitive information!

-- Sample from users table (structure only)
-- SELECT column_name, data_type 
-- FROM information_schema.columns 
-- WHERE table_name = 'users' 
-- ORDER BY ordinal_position;

-- Sample from organizations table
-- SELECT id, name, created_at 
-- FROM organizations 
-- LIMIT 5;

-- Sample from events table
-- SELECT id, title, event_type, created_at 
-- FROM events 
-- LIMIT 5;

-- ============================================================================
-- QUERY 14: Get Table Sizes
-- ============================================================================
-- This shows disk space usage
-- COPY THE OUTPUT AND SHARE IT

SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS total_size,
  pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) AS table_size,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) AS indexes_size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- ============================================================================
-- INSTRUCTIONS FOR SHARING RESULTS
-- ============================================================================
-- 1. Run each query above (1-14) in your Supabase SQL Editor
-- 2. Copy the results (you can export as CSV or just copy the table)
-- 3. Share ALL results with me in your next message
-- 4. You can format like this:
--
--    === QUERY 1 RESULTS ===
--    table_name | table_type
--    -----------|-----------
--    users      | BASE TABLE
--    events     | BASE TABLE
--    ...
--
--    === QUERY 2 RESULTS ===
--    ...
--
-- 5. This will give me a complete picture of your database structure!
-- ============================================================================
