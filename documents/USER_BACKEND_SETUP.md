# User Backend Setup - NFC Attendance System

## ✅ Database Setup Complete

Your `users` table in Supabase has been successfully created with the following structure:

### Table: `users`

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | uuid | Primary Key |
| `auth_id` | uuid | Foreign Key to `auth.users.id`, Unique |
| `name` | text | Not Null |
| `email` | text | Not Null, Unique |
| `user_type` | text | Not Null |
| `nfc_tag_id` | text | Unique, Nullable |
| `qr_code_data` | text | Unique, Nullable |
| `created_at` | timestamptz | Default: NOW() |
| `updated_at` | timestamptz | Default: NOW() |

## 📁 Backend Files Created

### 1. Type Definitions
- **File**: `src/types/user.ts`
- Defines TypeScript interfaces for User, UserType, and related types

### 2. Service Layer
- **File**: `src/lib/services/user.service.ts`
- Contains all database operations:
  - `getUserByAuthId()` - Get user by Supabase auth ID
  - `getUserById()` - Get user by profile ID
  - `getUserByEmail()` - Get user by email
  - `getUserByNfcTag()` - Get user by NFC tag (for scanning)
  - `getUserByQrCode()` - Get user by QR code
  - `createUser()` - Create new user profile
  - `updateUser()` - Update user profile
  - `deleteUser()` - Delete user profile
  - `hasProfile()` - Check if auth user has profile
  - `getAllUsers()` - Get all users (admin)
  - `isNfcTagAvailable()` - Check if NFC tag is available

### 3. API Routes

#### `GET /api/user/profile`
- Get current authenticated user's profile
- Returns full user object

#### `PUT /api/user/profile`
- Update current user's profile
- Body: `{ name?, user_type?, nfc_tag_id?, qr_code_data? }`

#### `GET /api/user/profile-status`
- Check if authenticated user has completed their profile
- Returns: `{ hasProfile: boolean, authId: string, email: string }`

#### `POST /api/user/complete-profile`
- Create user profile after authentication
- Body: `{ name: string, user_type: UserType, nfc_tag_id?, qr_code_data? }`

#### `GET /api/user/by-nfc?tag=<nfc_tag_id>`
- Get user by NFC tag ID (for attendance scanning)
- Returns minimal user info for privacy

### 4. React Hooks
- **File**: `src/hooks/use-user-profile.ts`
- `useUserProfile()` - Hook to get current user's profile
- `useProfileStatus()` - Hook to check if user has profile

### 5. UI Components
- **File**: `src/components/complete-profile-form.tsx`
- Form for users to complete their profile after signup
- **File**: `src/app/(authenticated)/complete-profile/page.tsx`
- Page wrapper for complete profile form

## 🔐 Security Recommendations for Supabase

### Row Level Security (RLS) Policies

Run these SQL commands in your Supabase SQL Editor to enable security:

```sql
-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own profile
CREATE POLICY "Users can view own profile"
  ON users
  FOR SELECT
  USING (auth.uid() = auth_id);

-- Policy: Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON users
  FOR UPDATE
  USING (auth.uid() = auth_id);

-- Policy: Users can insert their own profile (during registration)
CREATE POLICY "Users can insert own profile"
  ON users
  FOR INSERT
  WITH CHECK (auth.uid() = auth_id);

-- Policy: Admins can view all users (optional)
CREATE POLICY "Admins can view all users"
  ON users
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.auth_id = auth.uid()
      AND users.user_type = 'Admin'
    )
  );
```

### Database Indexes (for performance)

```sql
-- Index on auth_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_auth_id ON users(auth_id);

-- Index on email for faster searches
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Index on nfc_tag_id for faster NFC scans
CREATE INDEX IF NOT EXISTS idx_users_nfc_tag_id ON users(nfc_tag_id);

-- Index on user_type for filtering
CREATE INDEX IF NOT EXISTS idx_users_user_type ON users(user_type);
```

### Updated_at Trigger

```sql
-- Function to automatically update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at on row update
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

## 🚀 Usage Examples

### Client-Side: Get Current User Profile

```typescript
'use client'

import { useUserProfile } from '@/hooks/use-user-profile'

export function ProfileComponent() {
  const { user, loading, error, refetch } = useUserProfile()

  if (loading) return <div>Loading...</div>
  if (error) return <div>Error: {error}</div>
  if (!user) return <div>No profile found</div>

  return (
    <div>
      <h1>{user.name}</h1>
      <p>{user.email}</p>
      <p>Type: {user.user_type}</p>
      {user.nfc_tag_id && <p>NFC Tag: {user.nfc_tag_id}</p>}
    </div>
  )
}
```

### Server-Side: Get User in Server Component

```typescript
import { createClient } from '@/lib/server'
import { UserService } from '@/lib/services/user.service'

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  
  if (!authUser) {
    redirect('/login')
  }

  const user = await UserService.getUserByAuthId(authUser.id)
  
  return (
    <div>
      <h1>{user?.name}</h1>
      <p>{user?.email}</p>
    </div>
  )
}
```

### API: Scan NFC Tag

```typescript
// In your attendance scanning component
async function scanNfcTag(nfcTagId: string) {
  const response = await fetch(`/api/user/by-nfc?tag=${nfcTagId}`)
  const data = await response.json()
  
  if (response.ok) {
    console.log('User found:', data.user)
    // Mark attendance for this user
  } else {
    console.error('User not found')
  }
}
```

## 🔄 User Flow

1. **Sign Up** → User creates auth account (via Supabase Auth)
2. **Complete Profile** → User redirected to `/complete-profile` to create profile
3. **Dashboard Access** → User can now access protected routes

### Middleware Check (Optional Enhancement)

You can add a profile check to your middleware:

```typescript
// src/lib/middleware.ts
// Add after authentication check:

const pathname = request.nextUrl.pathname

// Check if user has profile (except on complete-profile page)
if (user && pathname !== '/complete-profile') {
  const hasProfile = await UserService.hasProfile(user.id)
  
  if (!hasProfile) {
    const url = request.nextUrl.clone()
    url.pathname = '/complete-profile'
    return NextResponse.redirect(url)
  }
}
```

## 📝 Environment Variables

Make sure your `.env.local` has:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY=your_anon_key
```

## ✨ Next Steps

1. ✅ Run the RLS policies SQL in Supabase
2. ✅ Run the indexes SQL for better performance
3. ✅ Run the trigger SQL for auto-updating timestamps
4. 🔨 Test the complete profile flow
5. 🔨 Test NFC scanning endpoint
6. 🔨 Build attendance tracking features on top of this

## 🎯 Features Implemented

- ✅ Complete User CRUD operations
- ✅ Type-safe TypeScript interfaces
- ✅ Service layer for database operations
- ✅ RESTful API routes
- ✅ React hooks for client-side data fetching
- ✅ Profile completion flow
- ✅ NFC tag lookup for attendance
- ✅ Authentication integration
- ✅ Error handling

Your user backend is now ready! 🎉
