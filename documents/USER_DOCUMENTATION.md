# User Feature Documentation

**Last Updated:** November 1, 2025  
**Status:** ✅ Production Ready

---

## Table of Contents
1. [Overview](#overview)
2. [Database Structure](#database-structure)
3. [API Endpoints](#api-endpoints)
4. [Frontend Components](#frontend-components)
5. [Types & Interfaces](#types--interfaces)
6. [Features](#features)
7. [Security & Authentication](#security--authentication)

---

## Overview

The User feature manages user profiles, authentication, and account settings in the NFC Attendance System. It integrates with Supabase Auth for authentication and provides profile management capabilities.

### Key Concepts
- **User Type**: Student or Faculty (Admin removed as of Task 2.1)
- **User Profile**: Name, email, user type, NFC tag, QR code
- **Authentication**: Handled by Supabase Auth
- **Profile Completion**: Required after first sign-up

---

## Database Structure

### Table: `users`

```sql
CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text UNIQUE NOT NULL,
  user_type text NOT NULL CHECK (user_type IN ('Student', 'Faculty')),
  auth_provider text NOT NULL DEFAULT 'email',
  has_password boolean NOT NULL DEFAULT true,
  nfc_tag_id text UNIQUE,
  qr_code_data text UNIQUE,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);
```

**Columns:**
- `id`: Unique identifier (UUID) - matches Supabase auth.users.id
- `name`: User's full name (required)
- `email`: User's email address (unique, required)
- `user_type`: Type of user - 'Student' or 'Faculty'
- `auth_provider`: Authentication provider (email, google, github, azure, facebook)
- `has_password`: Whether user has a password set
- `nfc_tag_id`: NFC tag identifier (unique, optional)
- `qr_code_data`: QR code data (unique, optional)
- `created_at`: Timestamp when user profile created
- `updated_at`: Timestamp when last updated (auto-updated via trigger)

**Constraints:**
- `PRIMARY KEY`: id
- `UNIQUE`: email, nfc_tag_id, qr_code_data
- `CHECK`: user_type must be 'Student' or 'Faculty'
- `NOT NULL`: id, name, email, user_type, auth_provider, has_password

**Indexes:**
- `users_pkey`: PRIMARY KEY on id
- `users_email_key`: UNIQUE on email
- `users_nfc_tag_id_key`: UNIQUE on nfc_tag_id
- `users_qr_code_data_key`: UNIQUE on qr_code_data
- `idx_users_email`: On email (for lookups)
- `idx_users_nfc_tag`: On nfc_tag_id
- `idx_users_user_type`: On user_type

**Triggers:**
- `update_users_updated_at`: Auto-updates `updated_at` on row modification

---

## Row Level Security (RLS) Policies

### Users Table Policies

1. **`users_can_insert_own_profile`** (INSERT)
   - Users can create their own profile
   - Checks: `auth.uid() = id`

2. **`users_can_view_own_profile`** (SELECT)
   - Users can view their own profile
   - Checks: `auth.uid() = id`

3. **`users_can_update_own_profile`** (UPDATE)
   - Users can update their own profile
   - Checks: `auth.uid() = id`

4. **`users_can_delete_own_profile`** (DELETE)
   - Users can delete their own profile
   - Checks: `auth.uid() = id`

---

## Database Functions

### User-Related Functions

```sql
-- Get user membership count
get_user_membership_count(p_user_id uuid) → integer
  -- Returns the number of organizations a user is a member of

-- Check NFC tag availability (implemented in UserService)
-- Verifies if an NFC tag is not already assigned to another user

-- Check QR code availability (implemented in UserService)
-- Verifies if QR code data is not already assigned to another user
```

---

## API Endpoints

### User Profile Management

#### `POST /api/user/complete-profile`
Complete user profile after initial sign-up.

**Request Body:**
```typescript
{
  name: string           // Required, user's full name
  user_type: UserType    // Required, 'Student' or 'Faculty'
  nfc_tag_id?: string    // Optional, NFC tag identifier
}
```

**Response:**
```typescript
{
  user: User
}
```

**Errors:**
- `400`: Missing name or invalid user type
- `401`: Unauthorized
- `409`: NFC tag already in use
- `500`: Server error

**Validation:**
- Name is required and must be a non-empty string
- user_type must be 'Student' or 'Faculty'
- nfc_tag_id must be unique (if provided)

---

#### `GET /api/user/profile`
Get current user's profile.

**Response:**
```typescript
{
  user: User
}
```

**Errors:**
- `401`: Unauthorized
- `404`: User profile not found

---

#### `PUT /api/user/profile`
Update current user's profile.

**Request Body:**
```typescript
{
  name?: string
  user_type?: UserType    // 'Student' or 'Faculty'
  nfc_tag_id?: string     // null to remove
}
```

**Response:**
```typescript
{
  user: User
}
```

**Errors:**
- `400`: Invalid input
- `401`: Unauthorized
- `409`: NFC tag already in use
- `500`: Server error

**Validation:**
- name must be a non-empty string if provided
- user_type must be 'Student' or 'Faculty' if provided
- nfc_tag_id uniqueness checked if provided

---

#### `GET /api/user/memberships`
Get current user's organization memberships with roles.

**Response:**
```typescript
{
  memberships: Array<{
    id: string
    organization_id: string
    user_id: string
    role: OrganizationRole
    joined_at: string
    organization: {
      id: string
      name: string
      tag: string | null
      description: string | null
    }
  }>
}
```

**Use Case:**
- Display user's organization memberships on profile page
- Show membership tags with organization abbreviations
- Example: "FOC: Admin" or "FOC" for Member role

---

### User Services

**Location:** `src/lib/services/user.service.ts`

#### UserService Methods

```typescript
// Get user by ID
static async getUserById(userId: string): Promise<User | null>

// Get user by email
static async getUserByEmail(email: string): Promise<User | null>

// Check if NFC tag is available
static async isNfcTagAvailable(nfcTagId: string, excludeUserId?: string): Promise<boolean>

// Check if QR code is available
static async isQrCodeAvailable(qrCodeData: string, excludeUserId?: string): Promise<boolean>

// Create new user profile
static async createUser(input: CreateUserInput): Promise<User>

// Update user profile
static async updateUser(userId: string, input: UpdateUserInput): Promise<User>

// Delete user profile
static async deleteUser(userId: string): Promise<void>
```

---

## Frontend Components

### Profile Management

#### `ProfilePage`
**Location:** `src/components/profile-page.tsx`

Main profile page component displaying user information and memberships.

**Features:**
- User profile card with:
  - Name and email
  - User type badge (Student/Faculty)
  - NFC tag ID display
  - QR code data display
  - Creation and update timestamps
- Organization memberships section:
  - List of memberships with tags
  - Role-based badge colors
  - Format: "TAG" for Member, "TAG: Role" for elevated roles
- Loading and error states
- Logout functionality

**User Type Badge Colors:**
- Student: Emerald green (`bg-emerald-600`)
- Faculty: Blue (`bg-blue-600`)

**Membership Badge Colors:**
- Owner: Violet (`bg-violet-600`)
- Admin: Blue (`bg-blue-600`)
- Attendance Taker: Cyan (`bg-cyan-600`)
- Member: Gray (`bg-gray-600`)

---

#### `CompleteProfileForm`
**Location:** `src/components/complete-profile-form.tsx`

Form for completing user profile after initial sign-up.

**Features:**
- Full name input (required)
- User type dropdown (Student or Faculty)
- NFC tag ID input (optional)
- Form validation
- Error handling
- Redirect to dashboard on success

**Validation:**
- Name cannot be empty
- User type selection required
- NFC tag ID optional but must be unique

---

### Authentication Components

#### `LoginForm`
**Location:** `src/components/login-form.tsx`

User login form.

**Features:**
- Email and password inputs
- Sign-in with Supabase Auth
- Error handling
- Redirect on successful login
- Link to sign-up page

---

#### `SignUpForm`
**Location:** `src/components/sign-up-form.tsx`

User registration form.

**Features:**
- Email and password inputs
- Password confirmation
- Account creation via Supabase Auth
- Email verification flow
- Redirect to sign-up success page

---

#### `ForgotPasswordForm`
**Location:** `src/components/forgot-password-form.tsx`

Password reset request form.

**Features:**
- Email input
- Send password reset link
- Success/error messages

---

#### `UpdatePasswordForm`
**Location:** `src/components/update-password-form.tsx`

Password update form (after reset link).

**Features:**
- New password input
- Password confirmation
- Update password via Supabase Auth
- Redirect to login on success

---

#### `LogoutButton`
**Location:** `src/components/logout-button.tsx`

Button component for user logout.

**Features:**
- Sign out via Supabase Auth
- Redirect to home page
- Error handling

---

## Types & Interfaces

### User Types
**Location:** `src/types/user.ts`

```typescript
// User type classification (Admin removed as of Nov 1, 2025)
export type UserType = 'Student' | 'Faculty'

// Authentication provider
export type AuthProvider = 'email' | 'google' | 'github' | 'azure' | 'facebook'

// Base user interface
export interface User {
  id: string                    // Supabase auth.users.id
  name: string
  email: string
  user_type: UserType
  auth_provider: AuthProvider
  has_password: boolean
  nfc_tag_id: string | null
  qr_code_data: string | null
  created_at: string
  updated_at: string
}

// Create user input
export interface CreateUserInput {
  name: string
  email: string
  user_type: UserType
  auth_provider: AuthProvider
  has_password: boolean
  nfc_tag_id?: string
  qr_code_data?: string
}

// Update user input
export interface UpdateUserInput {
  name?: string
  user_type?: UserType
  nfc_tag_id?: string | null
  qr_code_data?: string | null
}
```

---

## Features

### 1. User Registration
- Email/password sign-up via Supabase Auth
- Email verification required
- Automatic redirect to complete-profile page
- Profile completion before accessing features

### 2. Profile Completion
- Required after first sign-up
- Collect name, user type, optional NFC tag
- Validation of inputs
- Cannot access app without completing profile

### 3. Profile Management
- View profile information
- Display user type with color-coded badge
- Show NFC tag ID if assigned
- Display organization memberships with tags
- Membership format examples:
  - "FOC" (Member role)
  - "FOC: Admin" (Admin role)
  - "FOC: Owner" (Owner role)

### 4. Authentication Flow
- Login with email/password
- Sign up with email verification
- Password reset via email
- Logout functionality
- Protected routes with middleware

### 5. NFC Tag Management
- Assign NFC tag to profile
- Validate tag uniqueness
- Used for attendance tracking
- Optional field

### 6. User Type System
- **Student**: Regular student user
- **Faculty**: Faculty member user
- User type displayed with badge on profile
- Admin removed (now only an organization role)

---

## Security & Authentication

### Authentication

**Provider:** Supabase Auth

**Supported Methods:**
- Email/Password
- OAuth providers (Google, GitHub, Azure, Facebook)

**Session Management:**
- Server-side session validation
- Automatic token refresh
- Secure cookie storage

### Authorization

**Middleware:** `src/middleware.ts`

**Protected Routes:**
- `/dashboard`
- `/organizations/*`
- `/user/*`
- `/complete-profile`

**Public Routes:**
- `/login`
- `/sign-up`
- `/forgot-password`
- `/error`

### Profile Access Control

1. **Own Profile Only**
   - Users can only view/edit their own profile
   - RLS policies enforce this at database level

2. **Profile Completion Required**
   - Users redirected to `/complete-profile` if profile incomplete
   - Cannot access app features without completion

3. **Email Verification**
   - Required for email/password authentication
   - Enforced by Supabase Auth

### Data Validation

**Backend Validation:**
- User type must be 'Student' or 'Faculty'
- Email must be unique and valid format
- NFC tag must be unique if provided
- Name cannot be empty

**Frontend Validation:**
- Form validation before submission
- Required field checks
- Type-safe inputs with TypeScript

---

## User Type Changes (Task 2.1)

### What Changed
- **Removed:** 'Admin' user type
- **Remaining:** 'Student' and 'Faculty' only
- **Reason:** Admin functionality should be an organization role, not a user account type

### Database Migration
```sql
-- Update existing Admin users to Student (0 users affected)
UPDATE users SET user_type = 'Student' WHERE user_type = 'Admin';

-- Update CHECK constraint
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_user_type_check;
ALTER TABLE users ADD CONSTRAINT users_user_type_check 
CHECK (user_type IN ('Student', 'Faculty'));
```

### Impact
- ✅ All organization admin functionality preserved (via organization roles)
- ✅ No users affected (no Admin users existed in database)
- ✅ Cleaner user type system
- ✅ Frontend dropdowns updated
- ✅ API validation updated

---

## Error Handling

### Common Errors

- **Missing Profile**: User profile not found (404)
- **Duplicate Email**: Email already registered (409)
- **Duplicate NFC Tag**: NFC tag already in use (409)
- **Invalid User Type**: Must be 'Student' or 'Faculty' (400)
- **Unauthorized**: Not authenticated (401)
- **Incomplete Profile**: Profile completion required (redirected)

---

## Best Practices

1. **Always validate user type** when creating/updating profiles
2. **Check NFC tag uniqueness** before assignment
3. **Require profile completion** before app access
4. **Use TypeScript types** for type safety
5. **Handle authentication errors** gracefully
6. **Protect sensitive routes** with middleware
7. **Display clear error messages** to users

---

## Integration Points

### With Organization Feature
- Users can create organizations
- Users have roles within organizations
- Memberships displayed on profile page
- Organization tags shown with user memberships

### With Event Feature
- Users can create events (if member of organization)
- Users can attend events
- NFC tag used for attendance tracking

### With Attendance Feature
- NFC tag ID links user to attendance records
- QR code data for alternative check-in method
- User profile linked to attendance history

---

**End of User Documentation**
