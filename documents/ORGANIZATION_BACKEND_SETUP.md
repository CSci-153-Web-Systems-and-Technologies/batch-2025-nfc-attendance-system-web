# Organization Backend Setup - NFC Attendance System

## 📊 Database Schema

This document contains all SQL statements needed to set up the organization backend in Supabase.

## 🗄️ Tables

### 1. Organizations Table

```sql
-- Create organizations table
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  owner_user_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Foreign key to users table
  CONSTRAINT fk_owner_user
    FOREIGN KEY (owner_user_id)
    REFERENCES users(id)
    ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_organizations_owner ON organizations(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_organizations_created_at ON organizations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_organizations_name ON organizations(name);
```

### 2. Organization Members Table

```sql
-- Create organization_members table (junction table with roles)
CREATE TABLE IF NOT EXISTS organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  user_id UUID NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('Owner', 'Admin', 'Attendance Taker', 'Member')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
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
  
  -- Ensure a user can only be added once per organization
  CONSTRAINT unique_org_user UNIQUE (organization_id, user_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_org_members_org_id ON organization_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_members_user_id ON organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_org_members_role ON organization_members(role);
CREATE INDEX IF NOT EXISTS idx_org_members_joined_at ON organization_members(joined_at DESC);
```

## 🔐 Row Level Security (RLS) Policies

### Enable RLS

```sql
-- Enable Row Level Security on both tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
```

### Organizations Table Policies

```sql
-- Policy: Anyone can view organizations they are a member of
CREATE POLICY "Members can view their organizations"
  ON organizations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = organizations.id
      AND organization_members.user_id IN (
        SELECT id FROM users WHERE auth_id = auth.uid()
      )
    )
  );

-- Policy: Authenticated users can create organizations
CREATE POLICY "Authenticated users can create organizations"
  ON organizations
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND owner_user_id IN (
      SELECT id FROM users WHERE auth_id = auth.uid()
    )
  );

-- Policy: Owners and Admins can update organizations
CREATE POLICY "Owners and Admins can update organizations"
  ON organizations
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = organizations.id
      AND organization_members.user_id IN (
        SELECT id FROM users WHERE auth_id = auth.uid()
      )
      AND organization_members.role IN ('Owner', 'Admin')
    )
  );

-- Policy: Only owners can delete organizations
CREATE POLICY "Owners can delete organizations"
  ON organizations
  FOR DELETE
  USING (
    owner_user_id IN (
      SELECT id FROM users WHERE auth_id = auth.uid()
    )
  );
```

### Organization Members Table Policies

```sql
-- Policy: Members can view other members in their organizations
CREATE POLICY "Members can view members in their organizations"
  ON organization_members
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id IN (
        SELECT id FROM users WHERE auth_id = auth.uid()
      )
    )
  );

-- Policy: System can insert members (handled by service layer with proper auth)
CREATE POLICY "Owners and Admins can add members"
  ON organization_members
  FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT om.organization_id FROM organization_members om
      WHERE om.user_id IN (
        SELECT id FROM users WHERE auth_id = auth.uid()
      )
      AND om.role IN ('Owner', 'Admin')
    )
  );

-- Policy: Owners and Admins can update member roles
CREATE POLICY "Owners and Admins can update members"
  ON organization_members
  FOR UPDATE
  USING (
    organization_id IN (
      SELECT om.organization_id FROM organization_members om
      WHERE om.user_id IN (
        SELECT id FROM users WHERE auth_id = auth.uid()
      )
      AND om.role IN ('Owner', 'Admin')
    )
  );

-- Policy: Owners and Admins can remove members
CREATE POLICY "Owners and Admins can remove members"
  ON organization_members
  FOR DELETE
  USING (
    organization_id IN (
      SELECT om.organization_id FROM organization_members om
      WHERE om.user_id IN (
        SELECT id FROM users WHERE auth_id = auth.uid()
      )
      AND om.role IN ('Owner', 'Admin')
    )
  );
```

## 🔄 Database Functions and Triggers

### Auto-update timestamp trigger

```sql
-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for organizations table
CREATE TRIGGER update_organizations_updated_at
  BEFORE UPDATE ON organizations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for organization_members table
CREATE TRIGGER update_organization_members_updated_at
  BEFORE UPDATE ON organization_members
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

## 📋 Complete Setup Script

Run this complete script in your Supabase SQL Editor:

```sql
-- ============================================
-- COMPLETE ORGANIZATION BACKEND SETUP
-- ============================================

-- 1. Create organizations table
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  owner_user_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT fk_owner_user
    FOREIGN KEY (owner_user_id)
    REFERENCES users(id)
    ON DELETE CASCADE
);

-- 2. Create organization_members table
CREATE TABLE IF NOT EXISTS organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  user_id UUID NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('Owner', 'Admin', 'Attendance Taker', 'Member')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT fk_organization
    FOREIGN KEY (organization_id)
    REFERENCES organizations(id)
    ON DELETE CASCADE,
  
  CONSTRAINT fk_user
    FOREIGN KEY (user_id)
    REFERENCES users(id)
    ON DELETE CASCADE,
  
  CONSTRAINT unique_org_user UNIQUE (organization_id, user_id)
);

-- 3. Create indexes
CREATE INDEX IF NOT EXISTS idx_organizations_owner ON organizations(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_organizations_created_at ON organizations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_organizations_name ON organizations(name);

CREATE INDEX IF NOT EXISTS idx_org_members_org_id ON organization_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_members_user_id ON organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_org_members_role ON organization_members(role);
CREATE INDEX IF NOT EXISTS idx_org_members_joined_at ON organization_members(joined_at DESC);

-- 4. Enable RLS
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;

-- 5. Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. Create triggers
DROP TRIGGER IF EXISTS update_organizations_updated_at ON organizations;
CREATE TRIGGER update_organizations_updated_at
  BEFORE UPDATE ON organizations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_organization_members_updated_at ON organization_members;
CREATE TRIGGER update_organization_members_updated_at
  BEFORE UPDATE ON organization_members
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 7. Organizations RLS Policies
CREATE POLICY "Members can view their organizations"
  ON organizations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = organizations.id
      AND organization_members.user_id IN (
        SELECT id FROM users WHERE auth_id = auth.uid()
      )
    )
  );

CREATE POLICY "Authenticated users can create organizations"
  ON organizations
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND owner_user_id IN (
      SELECT id FROM users WHERE auth_id = auth.uid()
    )
  );

CREATE POLICY "Owners and Admins can update organizations"
  ON organizations
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = organizations.id
      AND organization_members.user_id IN (
        SELECT id FROM users WHERE auth_id = auth.uid()
      )
      AND organization_members.role IN ('Owner', 'Admin')
    )
  );

CREATE POLICY "Owners can delete organizations"
  ON organizations
  FOR DELETE
  USING (
    owner_user_id IN (
      SELECT id FROM users WHERE auth_id = auth.uid()
    )
  );

-- 8. Organization Members RLS Policies
CREATE POLICY "Members can view members in their organizations"
  ON organization_members
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id IN (
        SELECT id FROM users WHERE auth_id = auth.uid()
      )
    )
  );

CREATE POLICY "Owners and Admins can add members"
  ON organization_members
  FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT om.organization_id FROM organization_members om
      WHERE om.user_id IN (
        SELECT id FROM users WHERE auth_id = auth.uid()
      )
      AND om.role IN ('Owner', 'Admin')
    )
  );

CREATE POLICY "Owners and Admins can update members"
  ON organization_members
  FOR UPDATE
  USING (
    organization_id IN (
      SELECT om.organization_id FROM organization_members om
      WHERE om.user_id IN (
        SELECT id FROM users WHERE auth_id = auth.uid()
      )
      AND om.role IN ('Owner', 'Admin')
    )
  );

CREATE POLICY "Owners and Admins can remove members"
  ON organization_members
  FOR DELETE
  USING (
    organization_id IN (
      SELECT om.organization_id FROM organization_members om
      WHERE om.user_id IN (
        SELECT id FROM users WHERE auth_id = auth.uid()
      )
      AND om.role IN ('Owner', 'Admin')
    )
  );
```

## ✅ Verification Queries

After running the setup, verify everything is working:

```sql
-- Check if tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('organizations', 'organization_members');

-- Check if indexes exist
SELECT indexname 
FROM pg_indexes 
WHERE tablename IN ('organizations', 'organization_members');

-- Check if RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN ('organizations', 'organization_members');

-- Check policies
SELECT schemaname, tablename, policyname, cmd 
FROM pg_policies 
WHERE tablename IN ('organizations', 'organization_members');
```

## 🎯 Role Permissions Summary

| Role | Manage Org | Delete Org | Manage Members | Manage Events | Take Attendance | View Attendance |
|------|------------|------------|----------------|---------------|-----------------|-----------------|
| **Owner** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Admin** | ✅ | ❌ | ✅ | ✅ | ✅ | ✅ |
| **Attendance Taker** | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| **Member** | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |

## 📝 Notes

1. **Foreign Keys**: Organizations and members are properly linked to the `users` table
2. **Cascade Deletes**: When an organization is deleted, all members are automatically removed
3. **Unique Constraint**: A user can only be a member of an organization once
4. **Role Validation**: Only valid roles ('Owner', 'Admin', 'Attendance Taker', 'Member') are allowed
5. **Timestamps**: Both tables have `created_at` and `updated_at` fields that auto-update
6. **Indexes**: Performance-optimized with indexes on frequently queried columns

## 🚀 Next Steps

After running this setup:

1. Test creating an organization via the API
2. Test adding members with different roles
3. Verify permission checks work correctly
4. Monitor query performance with the indexes
5. Consider adding events table that references organizations
