# Membership Feature Quick Start Guide

Get started with the Membership feature in 5 minutes.

## Overview

The Membership feature connects users to organizations with roles. Think of it as a tagging system where each membership is a tag like "FOC:Admin" or "CSC:Member".

## Prerequisites

- ✅ Supabase project set up
- ✅ Users table exists
- ✅ Organizations table exists
- ✅ Backend is running

## Quick Setup

### 1. Run Database Migration (2 minutes)

Copy and run this SQL in your Supabase SQL Editor:

```sql
-- Create the table
CREATE TABLE IF NOT EXISTS organization_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('Owner', 'Admin', 'Attendance Taker', 'Member')),
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(user_id, organization_id)
);

-- Add indexes
CREATE INDEX idx_organization_members_user_id ON organization_members(user_id);
CREATE INDEX idx_organization_members_organization_id ON organization_members(organization_id);
CREATE INDEX idx_organization_members_user_org ON organization_members(user_id, organization_id);

-- Enable RLS
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;

-- Basic policies
CREATE POLICY "Users can view their own memberships"
  ON organization_members FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view org memberships they belong to"
  ON organization_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = organization_members.organization_id
      AND om.user_id = auth.uid()
    )
  );
```

### 2. Verify Setup (30 seconds)

Run this query to check:

```sql
SELECT COUNT(*) FROM organization_members;
```

If it returns `0` (or any number), you're good!

### 3. Test the API (2 minutes)

#### Add a member to an organization:

```bash
curl -X POST "http://localhost:3000/api/membership" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "user_id": "YOUR_USER_ID",
    "organization_id": "YOUR_ORG_ID",
    "role": "Member"
  }'
```

#### Get your memberships:

```bash
curl -X GET "http://localhost:3000/api/membership/user/YOUR_USER_ID" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### Get your membership tags:

```bash
curl -X GET "http://localhost:3000/api/membership/user/YOUR_USER_ID/tags" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Common Use Cases

### 1. Add a Member

```typescript
const response = await fetch('/api/membership', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    user_id: 'user-uuid',
    organization_id: 'org-uuid',
    role: 'Member'
  })
})
```

### 2. Promote to Admin

```typescript
const response = await fetch(`/api/membership/${membershipId}`, {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ role: 'Admin' })
})
```

### 3. Check User's Organizations

```typescript
const response = await fetch(`/api/membership/user/${userId}`)
const { memberships } = await response.json()
```

### 4. Get Organization Members

```typescript
const response = await fetch(`/api/membership/organization/${orgId}`)
const { members } = await response.json()
```

### 5. Transfer Ownership

```typescript
const response = await fetch('/api/membership/transfer-ownership', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    organization_id: 'org-uuid',
    new_owner_id: 'new-owner-uuid'
  })
})
```

## Using the Service Layer

For server-side operations:

```typescript
import { MembershipService } from '@/lib/services/membership.service'

// Add a member
const membership = await MembershipService.createMembership({
  user_id: 'user-uuid',
  organization_id: 'org-uuid',
  role: 'Member'
})

// Check permission
const hasAccess = await MembershipService.userHasPermission(
  'user-uuid',
  'org-uuid',
  'Admin'
)

// Get user's memberships
const memberships = await MembershipService.getUserMemberships('user-uuid')

// Get membership tags
const tags = await MembershipService.getUserMembershipTags('user-uuid')
```

## Role Hierarchy

```
Owner (Level 4) - Full control
  └─ Admin (Level 3) - Manage members & events
      └─ Attendance Taker (Level 2) - Take attendance
          └─ Member (Level 1) - Basic access
```

**Permission Check:**
If you have Admin, you also have Attendance Taker and Member permissions.

## Important Rules

1. ✅ **One membership per user per organization**
2. ✅ **Owner role is protected** - Use transfer ownership API
3. ✅ **Users can leave organizations** - Except Owners
4. ✅ **Only Admins/Owners can add members**
5. ✅ **Cascade deletes** - Deleting user/org deletes memberships

## Common Errors

### "Membership already exists"
User is already a member. Update their role instead:
```typescript
// Use PATCH /api/membership/{id} with new role
```

### "Cannot assign Owner role"
Use the transfer ownership endpoint instead:
```typescript
// POST /api/membership/transfer-ownership
```

### "Forbidden: Only Admins and Owners can add members"
You need Admin or Owner role to add members.

### "Cannot remove Owner"
Transfer ownership first, then remove.

## Testing Checklist

- [ ] Can create membership
- [ ] Can view own memberships
- [ ] Can view org members (if member)
- [ ] Can update member role (if admin)
- [ ] Can remove member (if admin)
- [ ] Can leave organization (self-remove)
- [ ] Cannot assign Owner role directly
- [ ] Cannot remove Owner
- [ ] Membership tags work correctly

## Next Steps

1. ✅ Set up frontend components for membership management
2. ✅ Add role-based UI conditionals
3. ✅ Implement member invitation system
4. ✅ Add membership notifications
5. ✅ Create member directory page

## Resources

- [Full Feature Documentation](./MEMBERSHIP_FEATURE_SUMMARY.md)
- [API Reference](./MEMBERSHIP_API_REFERENCE.md)
- [Backend Setup](./MEMBERSHIP_BACKEND_SETUP.md)

## Need Help?

Common debugging steps:
1. Check Supabase logs for RLS policy errors
2. Verify user is authenticated
3. Check user has correct role in organization
4. Test with Supabase SQL Editor first
5. Review RLS policies

## Example: Complete Flow

```typescript
// 1. Create organization (done by organization feature)
// 2. Add members
await MembershipService.createMembership({
  user_id: 'alice-uuid',
  organization_id: 'foc-uuid',
  role: 'Admin'
})

await MembershipService.createMembership({
  user_id: 'bob-uuid',
  organization_id: 'foc-uuid',
  role: 'Member'
})

// 3. Check permissions
const aliceIsAdmin = await MembershipService.userHasPermission(
  'alice-uuid',
  'foc-uuid',
  'Admin'
) // true

const bobIsAdmin = await MembershipService.userHasPermission(
  'bob-uuid',
  'foc-uuid',
  'Admin'
) // false

// 4. Get membership tags
const aliceTags = await MembershipService.getUserMembershipTags('alice-uuid')
// Result: [{ organization_name: 'FOC', role: 'Admin', tag: 'FOC:Admin' }]

// 5. Promote Bob to Admin
const bobMembership = await MembershipService.getUserMembershipInOrganization(
  'bob-uuid',
  'foc-uuid'
)

await MembershipService.updateMembership(bobMembership.id, {
  role: 'Admin'
})

// 6. Transfer ownership from you to Alice
await MembershipService.transferOwnership(
  'foc-uuid',
  'your-uuid',
  'alice-uuid'
)
```

---

That's it! You now have a working membership system. 🎉
