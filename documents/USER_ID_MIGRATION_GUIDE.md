# User ID Simplification Migration Guide

**Date:** October 29, 2025  
**Status:** Ready to Apply  
**Migration File:** `documents/user-id-simplification-migration.sql`

## Overview

This migration simplifies user identification and adds proper OAuth provider tracking to resolve issues with Google login vs email signup conflicts.

## Problems Solved

1. **Multiple confusing IDs**: Previously had `id`, `auth_id`, and references to `auth.user.id`
2. **OAuth users can't reset password**: Google signup users couldn't use forgot password
3. **No provider tracking**: Couldn't distinguish between email and OAuth signups
4. **Email conflicts**: Same email could create confusion between OAuth and email accounts

## Changes Made

### Database Schema Changes

#### Users Table
- **Removed**: Separate `id` column (UUID)
- **Changed**: `auth_id` renamed to `id` and made PRIMARY KEY
- **Added**: `auth_provider` column (email, google, github, azure, facebook)
- **Added**: `has_password` boolean flag

#### Foreign Key Updates
All tables referencing `users.id` now use the Supabase auth ID:
- `organizations.owner_user_id` → references `users.id` (auth ID)
- `organization_members.user_id` → references `users.id` (auth ID)
- `events.created_by` → references `users.id` (auth ID)

#### Views Recreated
- `membership_with_user` - includes new `auth_provider` and `has_password` fields
- `membership_with_organization` - updated to work with new ID structure

#### RLS Policies Recreated
All Row Level Security policies updated to use `auth.uid()` directly matching `users.id`:
- Users table policies (view, update, insert own profile)
- Organizations policies (CRUD operations)
- Organization members policies (role-based access)
- Events policies (member and admin access)

### TypeScript Changes

#### `src/types/user.ts`
```typescript
// OLD
interface User {
  id: string          // Separate UUID
  auth_id: string     // Supabase auth ID
  // ...
}

// NEW
interface User {
  id: string              // This IS the Supabase auth ID
  auth_provider: AuthProvider
  has_password: boolean
  // ...
}
```

#### `src/lib/services/user.service.ts`
- **Removed**: `getUserByAuthId()` - redundant with `getUserById()`
- **Added**: `canResetPassword()` - checks if user can reset password
- **Added**: `markPasswordSet()` - marks OAuth user has set password
- **Added**: `getAuthProviderFromUser()` - determines provider
- **Updated**: `createUser()` - now takes auth user ID directly as `id`

## Migration Steps

### 1. Backup Your Database
```bash
# Create a full backup before running migration
pg_dump your_database > backup_before_user_id_migration.sql
```

### 2. Run the Migration
The migration is wrapped in a transaction, so it will rollback on any error.

```sql
-- Execute the migration file
\i documents/user-id-simplification-migration.sql
```

### 3. Verify the Migration
After running, uncomment and run the verification queries at the end of the migration file:

```sql
-- Verify all foreign keys are working
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

-- Check users table structure
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'users'
ORDER BY ordinal_position;

-- Verify all users have valid auth_provider values
SELECT auth_provider, has_password, COUNT(*) as count
FROM users
GROUP BY auth_provider, has_password;
```

### 4. Deploy Code Changes
After successful database migration, deploy the updated TypeScript code.

## New Features Enabled

### 1. Unified Email Handling
- Email uniqueness constraint prevents duplicate accounts
- OAuth and email signups share the same email validation

### 2. Password Reset for OAuth Users
OAuth users (Google, etc.) can now:
1. Go to "Forgot Password"
2. Receive guidance about setting a password
3. Use the password reset link to set their first password
4. Login with either OAuth or email/password afterward

### 3. Simplified Development
- One user ID concept: `users.id` = `auth.uid()`
- No more confusion about which ID to use
- Clearer code and fewer bugs

## Code Examples

### Before
```typescript
// Confusing - which ID to use?
const user = await UserService.getUserByAuthId(authUser.id)
// user.id !== authUser.id ❌

// In queries
.eq('user_id', user.id)  // Which user.id? The UUID or auth_id?
```

### After
```typescript
// Clear and simple
const user = await UserService.getUserById(authUser.id)
// user.id === authUser.id ✅

// In queries
.eq('user_id', authUser.id)  // Always the auth ID
```

## Rollback Plan

If issues occur, the migration can be rolled back:

1. **Before COMMIT**: Simply run `ROLLBACK;` instead
2. **After COMMIT**: Restore from backup:
   ```bash
   psql your_database < backup_before_user_id_migration.sql
   ```

## Testing Checklist

- [ ] Existing users can still login
- [ ] Google OAuth login works
- [ ] Email/password login works
- [ ] New user signup (email) creates profile correctly
- [ ] New user signup (Google) creates profile correctly
- [ ] Complete profile flow works
- [ ] Organization creation works
- [ ] Organization membership works
- [ ] Event creation works
- [ ] Forgot password guides OAuth users appropriately
- [ ] OAuth users can set password via reset link

## Support

If you encounter issues:
1. Check the error logs in Supabase dashboard
2. Verify RLS policies are enabled
3. Check that `auth.uid()` matches `users.id` for current user
4. Review the verification queries results
