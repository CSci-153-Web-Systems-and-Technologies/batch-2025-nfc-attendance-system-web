-- ============================================================================
-- ADD ORGANIZATION TAG FEATURE
-- ============================================================================
-- This script adds a 'tag' field to the organizations table
-- The tag is a short abbreviation (e.g., "FOC" for "Faculty of Computing")
-- Tags will be used to display organization memberships on user profiles
-- ============================================================================

-- ============================================================================
-- 1. ADD TAG COLUMN TO ORGANIZATIONS TABLE
-- ============================================================================

ALTER TABLE organizations 
ADD COLUMN tag TEXT;

COMMENT ON COLUMN organizations.tag IS 'Short abbreviation/tag for the organization (e.g., FOC, CS, etc.)';

-- ============================================================================
-- 2. ADD UNIQUE CONSTRAINT ON TAG
-- ============================================================================
-- This ensures no two organizations can have the same tag

ALTER TABLE organizations
ADD CONSTRAINT unique_organization_tag UNIQUE (tag);

-- ============================================================================
-- 3. ADD INDEX ON TAG FOR FASTER LOOKUPS
-- ============================================================================

CREATE INDEX idx_organizations_tag ON organizations(tag);

-- ============================================================================
-- 4. VERIFICATION QUERIES
-- ============================================================================

-- Verify the tag column was added
-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'organizations' AND column_name = 'tag';

-- Verify the unique constraint exists
-- SELECT constraint_name, constraint_type 
-- FROM information_schema.table_constraints 
-- WHERE table_name = 'organizations' AND constraint_name = 'unique_organization_tag';

-- Verify the index exists
-- SELECT indexname, indexdef 
-- FROM pg_indexes 
-- WHERE tablename = 'organizations' AND indexname = 'idx_organizations_tag';

-- ============================================================================
-- NOTES
-- ============================================================================
-- - Tag is optional (nullable) to allow existing organizations to work
-- - Tag should be set when creating new organizations
-- - Tag must be unique across all organizations
-- - Recommended: Add validation in the frontend for tag format (e.g., 2-10 uppercase letters)
-- - RLS policies don't need updating as they already allow access to all organization columns
-- ============================================================================

-- ============================================================================
-- SETUP COMPLETE
-- ============================================================================
-- Run this SQL in your Supabase SQL Editor
-- Then update the frontend code to handle the new tag field
-- ============================================================================
