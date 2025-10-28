# User ID Simplification - Implementation Summary

## ✅ Completed Tasks

###  1. Database Migration
- ✅ Ran `user-id-simplification-migration.sql` successfully
- ✅ Removed old `id` column from users table
- ✅ Renamed `auth_id` to `id` (now primary key)
- ✅ Added `auth_provider` column (tracks email/google/etc.)
- ✅ Added `has_password` column (tracks if password is set)
- ✅ Updated all foreign key references
- ✅ Recreated all RLS policies
- ✅ Recreated views with new structure

### 2. TypeScript Types
- ✅ Updated `src/types/user.ts` to reflect new schema
- ✅ Added `AuthProvider` type
- ✅ Added `AuthProviderInfo` interface
- ✅ Removed separate `auth_id` field from User interface

### 3. User Service
- ✅ Updated `src/lib/services/user.service.ts`
- ✅ Removed `getUserByAuthId()` method
- ✅ Updated `getUserById()` to use `id` directly
- ✅ Added `canResetPassword()` - checks OAuth vs email users
- ✅ Added `markPasswordSet()` - for OAuth users setting password
- ✅ Added `getAuthProviderFromUser()` - determines provider
- ✅ Added `authUserHasPassword()` - checks if user has password

### 4. Authentication Flow
- ✅ Updated `src/app/(auth)/confirm/route.ts`
- ✅ Updated `src/lib/middleware.ts`
- ✅ Both now use `getUserById` with auth user ID directly

### 5. User API Routes
- ✅ Updated `src/app/api/user/complete-profile/route.ts`
- ✅ Updated `src/app/api/user/profile/route.ts`
- ✅ Created `src/app/api/user/check-password-reset/route.ts`
- ✅ Created `src/app/api/user/mark-password-set/route.ts`

### 6. Password Reset Flow
- ✅ Updated `src/components/forgot-password-form.tsx`
  - Now checks if user is OAuth without password
  - Guides OAuth users to set password
  - Explains they can login with either OAuth or email/password after
- ✅ Updated `src/components/update-password-form.tsx`
  - Calls API to mark password as set after update

## ⚠️ Remaining Tasks

### 7. Organization & Event API Routes
There are **13 files** that still need updating. They currently use:
- `getUserByAuthId(user.id)` → needs to be `getUserById(user.id)`
- `userProfile.id` → can now use `user.id` directly

**Files to update:**

1. `src/app/api/organization/[id]/transfer-ownership/route.ts` (1 occurrence)
2. `src/app/api/organization/[id]/route.ts` (3 occurrences)
3. `src/app/api/organization/[id]/members/[userId]/route.ts` (3 occurrences)
4. `src/app/api/organization/[id]/members/route.ts` (2 occurrences)
5. `src/app/api/organization/[id]/events/route.ts` (1 occurrence)
6. `src/app/api/event/[id]/route.ts` (3 occurrences)

### Manual Update Pattern

For each file, make these changes:

**Before:**
```typescript
const userProfile = await UserService.getUserByAuthId(user.id)

if (!userProfile) {
  return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
}

// Later in the file...
const result = await SomeService.someMethod(userProfile.id, ...)
```

**After:**
```typescript
const userProfile = await UserService.getUserById(user.id)

if (!userProfile) {
  return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
}

// Later in the file...
const result = await SomeService.someMethod(user.id, ...)
```

**Key changes:**
1. Replace `getUserByAuthId` → `getUserById`
2. Replace `userProfile.id` → `user.id` (since they're now the same)

### Quick Find & Replace in VS Code

1. Open VS Code Search (Ctrl+Shift+F)
2. Search for: `getUserByAuthId`
3. Replace with: `getUserById`
4. Filter files: `src/app/api/**/*.ts`
5. Replace all

Then:
1. Search for: `userProfile\.id` (enable regex)
2. Manually review each and replace with `user.id` where appropriate
3. Be careful not to replace `userProfile.id` in response objects where you're returning the user profile

## Testing Checklist

After completing the remaining updates, test:

- [ ] Email signup creates profile with `auth_provider='email'` and `has_password=true`
- [ ] Google signup creates profile with `auth_provider='google'` and `has_password=false`
- [ ] Email login works
- [ ] Google login works
- [ ] Forgot password for email users sends reset email
- [ ] Forgot password for OAuth users shows "set password" flow
- [ ] OAuth user can set password via reset link
- [ ] OAuth user can login with either Google OR email/password after setting password
- [ ] Creating organization works
- [ ] Joining organization works
- [ ] Creating events works
- [ ] All organization permissions work correctly

## Benefits of This Change

1. **Simpler Mental Model**: One user ID = auth.uid()
2. **No More Confusion**: No more "which ID do I use?"
3. **OAuth Password Setting**: Users can add password to OAuth accounts
4. **Unified Login**: After setting password, OAuth users can use either method
5. **Better Tracking**: Know exactly how each user signed up
6. **Fewer Bugs**: Simpler code = fewer mistakes

## Verification Commands

Run these in Supabase SQL Editor:

```sql
-- Check user table structure
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'users' 
ORDER BY ordinal_position;

-- Verify users data
SELECT id, name, email, auth_provider, has_password 
FROM users 
LIMIT 10;

-- Check foreign keys work
SELECT COUNT(*) FROM organization_members;
SELECT COUNT(*) FROM organizations;
SELECT COUNT(*) FROM events;
```

All should return without errors.
