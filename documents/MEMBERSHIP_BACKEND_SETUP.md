# Membership Backend Setup for Supabase

This guide provides the necessary SQL and configuration to set up the membership feature in Supabase.

## Prerequisites

- Supabase project created
- `users` table exists
- `organizations` table exists
- Row Level Security (RLS) enabled on your project

## 1. Create the Membership Table

Run this SQL in your Supabase SQL Editor:

```sql
-- Create organization_members table
CREATE TABLE IF NOT EXISTS organization_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('Owner', 'Admin', 'Attendance Taker', 'Member')),
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  
  -- Ensure a user can only have one membership per organization
  UNIQUE(user_id, organization_id)
);

-- Add indexes for better query performance
CREATE INDEX idx_organization_members_user_id ON organization_members(user_id);
CREATE INDEX idx_organization_members_organization_id ON organization_members(organization_id);
CREATE INDEX idx_organization_members_role ON organization_members(role);
CREATE INDEX idx_organization_members_joined_at ON organization_members(joined_at DESC);

-- Add composite index for common queries
CREATE INDEX idx_organization_members_user_org ON organization_members(user_id, organization_id);
```

## 2. Create Updated_at Trigger

Automatically update the `updated_at` timestamp:

```sql
-- Create or replace function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc'::text, NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for organization_members
DROP TRIGGER IF EXISTS update_organization_members_updated_at ON organization_members;
CREATE TRIGGER update_organization_members_updated_at
  BEFORE UPDATE ON organization_members
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

## 3. Row Level Security (RLS) Policies

Enable RLS and create policies:

```sql
-- Enable RLS on organization_members table
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;

-- Policy 1: Users can view their own memberships
CREATE POLICY "Users can view their own memberships"
  ON organization_members
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy 2: Users can view memberships of organizations they belong to
CREATE POLICY "Users can view organization memberships they belong to"
  ON organization_members
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = organization_members.organization_id
      AND om.user_id = auth.uid()
    )
  );

-- Policy 3: Admins and Owners can insert new memberships
CREATE POLICY "Admins and Owners can add members"
  ON organization_members
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = organization_members.organization_id
      AND om.user_id = auth.uid()
      AND om.role IN ('Owner', 'Admin')
    )
  );

-- Policy 4: Admins and Owners can update memberships (except Owner role)
CREATE POLICY "Admins and Owners can update memberships"
  ON organization_members
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = organization_members.organization_id
      AND om.user_id = auth.uid()
      AND om.role IN ('Owner', 'Admin')
    )
    AND organization_members.role != 'Owner'
  )
  WITH CHECK (
    role != 'Owner'
  );

-- Policy 5: Admins and Owners can delete memberships (except Owner)
CREATE POLICY "Admins and Owners can remove members"
  ON organization_members
  FOR DELETE
  USING (
    role != 'Owner'
    AND EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = organization_members.organization_id
      AND om.user_id = auth.uid()
      AND om.role IN ('Owner', 'Admin')
    )
  );

-- Policy 6: Users can remove their own membership (leave organization)
CREATE POLICY "Users can leave organizations"
  ON organization_members
  FOR DELETE
  USING (
    auth.uid() = user_id
    AND role != 'Owner'
  );
```

## 4. Helper Functions

Create functions for common operations:

```sql
-- Function to check if user has specific role in organization
CREATE OR REPLACE FUNCTION user_has_role(
  p_user_id UUID,
  p_organization_id UUID,
  p_role TEXT
)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM organization_members
    WHERE user_id = p_user_id
    AND organization_id = p_organization_id
    AND role = p_role
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user has permission level in organization
CREATE OR REPLACE FUNCTION user_has_permission(
  p_user_id UUID,
  p_organization_id UUID,
  p_required_role TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  v_user_role TEXT;
  v_role_level INT;
  v_required_level INT;
BEGIN
  -- Get user's role
  SELECT role INTO v_user_role
  FROM organization_members
  WHERE user_id = p_user_id
  AND organization_id = p_organization_id;

  -- If no membership found, return false
  IF v_user_role IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Define role hierarchy
  v_role_level := CASE v_user_role
    WHEN 'Owner' THEN 4
    WHEN 'Admin' THEN 3
    WHEN 'Attendance Taker' THEN 2
    WHEN 'Member' THEN 1
    ELSE 0
  END;

  v_required_level := CASE p_required_role
    WHEN 'Owner' THEN 4
    WHEN 'Admin' THEN 3
    WHEN 'Attendance Taker' THEN 2
    WHEN 'Member' THEN 1
    ELSE 0
  END;

  RETURN v_role_level >= v_required_level;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get membership count for an organization
CREATE OR REPLACE FUNCTION get_organization_member_count(p_organization_id UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::INTEGER
    FROM organization_members
    WHERE organization_id = p_organization_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get membership count for a user
CREATE OR REPLACE FUNCTION get_user_membership_count(p_user_id UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::INTEGER
    FROM organization_members
    WHERE user_id = p_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## 5. Prevent Multiple Owners

Create a constraint to ensure only one owner per organization:

```sql
-- Function to check only one owner per organization
CREATE OR REPLACE FUNCTION check_single_owner()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.role = 'Owner' THEN
    IF EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_id = NEW.organization_id
      AND role = 'Owner'
      AND id != NEW.id
    ) THEN
      RAISE EXCEPTION 'Organization can only have one owner';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to enforce single owner
DROP TRIGGER IF EXISTS check_single_owner_trigger ON organization_members;
CREATE TRIGGER check_single_owner_trigger
  BEFORE INSERT OR UPDATE ON organization_members
  FOR EACH ROW
  EXECUTE FUNCTION check_single_owner();
```

## 6. Update Organizations Table

Ensure the organizations table has the necessary structure:

```sql
-- Add updated_at to organizations if not exists
ALTER TABLE organizations 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL;

-- Add trigger for organizations updated_at
DROP TRIGGER IF EXISTS update_organizations_updated_at ON organizations;
CREATE TRIGGER update_organizations_updated_at
  BEFORE UPDATE ON organizations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

## 7. Test Data (Optional)

Sample data for testing:

```sql
-- Note: Replace UUIDs with actual user and organization IDs from your database

-- Example: Add owner membership (should already exist from organization creation)
INSERT INTO organization_members (user_id, organization_id, role)
VALUES 
  ('your-user-uuid', 'your-org-uuid', 'Owner')
ON CONFLICT (user_id, organization_id) DO NOTHING;

-- Example: Add admin membership
INSERT INTO organization_members (user_id, organization_id, role)
VALUES 
  ('another-user-uuid', 'your-org-uuid', 'Admin')
ON CONFLICT (user_id, organization_id) DO NOTHING;

-- Example: Add regular member
INSERT INTO organization_members (user_id, organization_id, role)
VALUES 
  ('member-user-uuid', 'your-org-uuid', 'Member')
ON CONFLICT (user_id, organization_id) DO NOTHING;
```

## 8. Verification Queries

Use these queries to verify the setup:

```sql
-- Check table structure
SELECT 
  column_name, 
  data_type, 
  is_nullable, 
  column_default
FROM information_schema.columns
WHERE table_name = 'organization_members'
ORDER BY ordinal_position;

-- Check indexes
SELECT 
  indexname, 
  indexdef
FROM pg_indexes
WHERE tablename = 'organization_members';

-- Check RLS policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'organization_members';

-- Check triggers
SELECT 
  trigger_name,
  event_manipulation,
  action_statement
FROM information_schema.triggers
WHERE event_object_table = 'organization_members';

-- Count memberships by role
SELECT 
  role,
  COUNT(*) as count
FROM organization_members
GROUP BY role
ORDER BY count DESC;
```

## 9. Environment Variables

Make sure your Next.js `.env.local` file includes:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## 10. Migration Checklist

- [ ] Create `organization_members` table
- [ ] Add indexes for performance
- [ ] Create `updated_at` trigger
- [ ] Enable RLS on the table
- [ ] Create all RLS policies
- [ ] Create helper functions
- [ ] Add single owner constraint
- [ ] Update organizations table if needed
- [ ] Test with sample data
- [ ] Verify all policies work correctly
- [ ] Update environment variables

## Security Notes

1. **RLS Enabled**: All queries are filtered by RLS policies
2. **Cascade Deletes**: Memberships are automatically deleted when users or organizations are deleted
3. **Owner Protection**: Owner role cannot be changed except through transfer ownership
4. **Self-Service**: Users can always leave organizations (except owners)
5. **Permission Hierarchy**: Enforced at both service and database levels

## Troubleshooting

### Issue: Cannot insert memberships
- Check if RLS policies are enabled
- Verify user has Admin or Owner role in the organization
- Ensure unique constraint isn't violated

### Issue: Cannot view memberships
- Verify user is authenticated
- Check if user is a member of the organization
- Review RLS SELECT policies

### Issue: Multiple owners created
- Ensure the single owner trigger is created
- Check if trigger is active: `SELECT * FROM pg_trigger WHERE tgname = 'check_single_owner_trigger';`

### Issue: Updated_at not updating
- Verify the trigger exists and is active
- Check trigger function is created correctly

## Performance Considerations

1. **Indexes**: All foreign keys are indexed for fast lookups
2. **Composite Index**: User-organization queries are optimized
3. **Counting**: Use the helper functions for counting memberships
4. **Batch Operations**: Use bulk operations when adding multiple members

## Next Steps

After setup:
1. Test all API endpoints
2. Verify permissions work correctly
3. Test ownership transfer
4. Monitor query performance
5. Add any custom business rules needed

## Related Documentation

- [Membership Feature Summary](./MEMBERSHIP_FEATURE_SUMMARY.md)
- [Membership API Reference](./MEMBERSHIP_API_REFERENCE.md)
- [Organization Backend Setup](./ORGANIZATION_BACKEND_SETUP.md)
