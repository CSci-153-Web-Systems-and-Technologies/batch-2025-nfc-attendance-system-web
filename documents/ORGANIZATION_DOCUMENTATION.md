# Organization Feature Documentation

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
7. [Security & Permissions](#security--permissions)

---

## Overview

The Organization feature allows users to create and manage organizations within the NFC Attendance System. Organizations serve as containers for members and events, with role-based access control.

### Key Concepts
- **Organization**: A group/club/team entity that can have multiple members
- **Organization Roles**: Owner, Admin, Attendance Taker, Member
- **Organization Tag**: Short abbreviation for quick identification (e.g., "FOC" for Faculty of Computing)
- **Join Requests**: Request-based workflow for joining organizations

---

## Database Structure

### Table: `organizations`

```sql
CREATE TABLE organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  tag text UNIQUE,  -- Short abbreviation (e.g., "FOC")
  owner_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);
```

**Columns:**
- `id`: Unique identifier (UUID)
- `name`: Organization name (required)
- `description`: Optional description text
- `tag`: Unique organization abbreviation/tag (e.g., "FOC")
- `owner_user_id`: Reference to the user who owns the organization
- `created_at`: Timestamp when created
- `updated_at`: Timestamp when last updated (auto-updated via trigger)

**Constraints:**
- `PRIMARY KEY`: id
- `UNIQUE`: tag (organization tags must be unique)
- `FOREIGN KEY`: owner_user_id → users(id) ON DELETE CASCADE
- `NOT NULL`: name, owner_user_id

**Indexes:**
- `organizations_pkey`: PRIMARY KEY on id
- `organizations_tag_key`: UNIQUE on tag
- `idx_organizations_name`: On name (for search)
- `idx_organizations_owner`: On owner_user_id
- `idx_organizations_created_at`: On created_at DESC

**Triggers:**
- `update_organizations_updated_at`: Auto-updates `updated_at` on row modification

---

### Table: `organization_members`

```sql
CREATE TABLE organization_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('Owner', 'Admin', 'Attendance Taker', 'Member')),
  joined_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(organization_id, user_id)
);
```

**Columns:**
- `id`: Unique identifier (UUID)
- `organization_id`: Reference to organization
- `user_id`: Reference to user
- `role`: Member's role within the organization
- `joined_at`: Timestamp when user joined
- `updated_at`: Timestamp when last updated

**Constraints:**
- `PRIMARY KEY`: id
- `UNIQUE`: (organization_id, user_id) - one membership per user per org
- `CHECK`: role must be one of: 'Owner', 'Admin', 'Attendance Taker', 'Member'
- `FOREIGN KEY`: organization_id → organizations(id) ON DELETE CASCADE
- `FOREIGN KEY`: user_id → users(id) ON DELETE CASCADE

**Indexes:**
- Multiple indexes for query optimization (org_id, user_id, role, joined_at)

**Triggers:**
- `update_org_members_updated_at`: Auto-updates `updated_at`
- `check_single_owner_trigger`: Ensures only one Owner per organization
- `enforce_single_owner`: Additional owner enforcement

---

### Table: `organization_join_requests`

```sql
CREATE TABLE organization_join_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  requested_at timestamp with time zone DEFAULT now(),
  reviewed_at timestamp with time zone,
  reviewed_by uuid REFERENCES users(id),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(organization_id, user_id, status)
);
```

**Columns:**
- `id`: Unique identifier (UUID)
- `organization_id`: Organization being requested
- `user_id`: User making the request
- `status`: Request status (pending/approved/rejected)
- `requested_at`: When the request was made
- `reviewed_at`: When request was reviewed (null if pending)
- `reviewed_by`: User who reviewed the request
- `created_at`: Record creation timestamp
- `updated_at`: Record update timestamp

**Constraints:**
- `CHECK`: status must be 'pending', 'approved', or 'rejected'
- `UNIQUE`: (organization_id, user_id, status) - prevents duplicate pending requests

---

## Row Level Security (RLS) Policies

### Organizations Table Policies

1. **`Authenticated users can create organizations`** (INSERT)
   - Any authenticated user can create an organization
   - Creator automatically becomes Owner

2. **`users_can_create_organizations`** (INSERT)
   - Alternative create policy

3. **`members_can_view_their_organizations`** (SELECT)
   - Users can view organizations they are members of
   - Uses `is_org_member()` function

4. **`admins_can_update_organizations`** (UPDATE)
   - Owners and Admins can update organization details
   - Uses `is_org_admin()` or `is_org_owner()` functions

5. **`owners_can_delete_organizations`** (DELETE)
   - Only Owners can delete their organizations
   - Uses `is_org_owner()` function

### Organization Members Table Policies

1. **`Owners and Admins can add members`** (INSERT)
   - Owners/Admins can add new members
   - Uses EXISTS subquery for permission check

2. **`admins_can_add_members`** (INSERT)
   - Function-based add policy

3. **`Users can view their own memberships`** (SELECT)
   - Users can see their organization memberships

4. **`members_can_view_other_members`** (SELECT)
   - Organization members can view other members
   - Uses `is_org_member()` function

5. **`Owners and Admins can update members`** (UPDATE)
   - Can modify member roles

6. **`Users can leave organizations`** (DELETE)
   - Members can remove themselves (except Owners)

7. **`Owners and Admins can remove members`** (DELETE)
   - Can remove other members

### Organization Join Requests Table Policies

1. **`Users can create join requests`** (INSERT)
   - Any authenticated user can request to join

2. **`Users can view their own requests`** (SELECT)
   - Users can see their pending requests

3. **`Admins can view join requests`** (SELECT)
   - Owners/Admins can see pending requests for their orgs

4. **`Admins can update join requests`** (UPDATE)
   - Owners/Admins can approve/reject requests

---

## Database Functions

### Helper Functions

```sql
-- Check if user is organization member
is_org_member(org_id uuid, user_auth_id uuid) → boolean

-- Check if user is organization admin
is_org_admin(org_id uuid, user_auth_id uuid) → boolean

-- Check if user is organization owner
is_org_owner(org_id uuid, user_auth_id uuid) → boolean

-- Get user's role in organization
get_user_role_in_organization(p_user_id uuid, p_organization_id uuid) → text

-- Check if user has specific permission
user_has_permission(p_user_id uuid, p_organization_id uuid, p_required_role text) → boolean

-- Check if user has specific role
user_has_role(p_user_id uuid, p_organization_id uuid, p_role text) → boolean

-- Get organization member count
get_organization_member_count(p_organization_id uuid) → integer

-- Approve join request (creates membership)
approve_join_request(p_request_id uuid, p_reviewer_id uuid) → boolean
```

---

## API Endpoints

### Organizations

#### `POST /api/organization`
Create a new organization.

**Request Body:**
```typescript
{
  name: string           // Required
  description?: string   // Optional
  tag?: string          // Optional, unique abbreviation
}
```

**Response:**
```typescript
{
  data: Organization
}
```

**Errors:**
- `400`: Missing name or duplicate tag
- `401`: Unauthorized
- `500`: Server error

---

#### `GET /api/organization/search`
Search organizations with pagination and filters.

**Query Parameters:**
- `q`: Search query (searches name and description)
- `page`: Page number (default: 1)
- `limit`: Results per page (default: 10, max: 50)
- `sort`: Sort field (name, created_at, member_count)
- `order`: Sort order (asc, desc)
- `min_members`: Minimum member count filter
- `max_members`: Maximum member count filter
- `exclude_joined`: Exclude user's organizations (default: false)

**Response:**
```typescript
{
  results: Array<Organization & {
    member_count: number
    is_member: boolean
    has_pending_request: boolean
  }>
  pagination: {
    page: number
    limit: number
    total: number
    total_pages: number
    has_next_page: boolean
    has_previous_page: boolean
  }
  filters: {
    query: string
    sort_field: string
    sort_order: string
    min_members?: number
    max_members?: number
    exclude_joined: boolean
  }
}
```

---

#### `GET /api/organization/[id]`
Get organization details by ID.

**Response:**
```typescript
{
  organization: Organization & {
    member_count: number
    user_role: OrganizationRole | null
  }
}
```

---

#### `PUT /api/organization/[id]`
Update organization details (Owner/Admin only).

**Request Body:**
```typescript
{
  name?: string
  description?: string
  tag?: string
}
```

**Response:**
```typescript
{
  organization: Organization
}
```

---

#### `DELETE /api/organization/[id]`
Delete organization (Owner only).

**Response:**
```typescript
{
  message: "Organization deleted successfully"
}
```

---

#### `GET /api/organization/[id]/members`
Get all members of an organization.

**Response:**
```typescript
{
  members: Array<{
    id: string
    organization_id: string
    user_id: string
    role: OrganizationRole
    joined_at: string
    user: {
      name: string
      email: string
      user_type: string
    }
  }>
}
```

---

#### `POST /api/organization/[id]/members`
Add a member to organization (Owner/Admin only).

**Request Body:**
```typescript
{
  user_id: string
  role: OrganizationRole  // 'Owner' | 'Admin' | 'Attendance Taker' | 'Member'
}
```

---

#### `GET /api/organization/[id]/join-requests`
Get pending join requests for organization (Owner/Admin only).

**Response:**
```typescript
{
  requests: Array<JoinRequestWithUser>
}
```

---

### Join Requests

#### `POST /api/membership/request`
Request to join an organization.

**Request Body:**
```typescript
{
  organization_id: string
}
```

**Response:**
```typescript
{
  message: "Join request sent successfully"
  request: JoinRequest
}
```

---

#### `POST /api/membership/approve`
Approve a join request (Owner/Admin only).

**Request Body:**
```typescript
{
  request_id: string
  organization_id: string
}
```

**Response:**
```typescript
{
  message: "Join request approved successfully"
}
```

---

#### `POST /api/membership/reject`
Reject a join request (Owner/Admin only).

**Request Body:**
```typescript
{
  request_id: string
  organization_id: string
}
```

**Response:**
```typescript
{
  message: "Join request rejected successfully"
}
```

---

## Frontend Components

### Main Views

#### `OrganizationMainView`
**Location:** `src/components/organizations/organization-main-view.tsx`

Main dashboard view showing user's organizations with sidebar list and content panel.

**Features:**
- Sidebar with organization list
- Selected organization content display
- Create and search organization buttons
- Mobile-responsive toggle

---

#### `OrganizationContent`
**Location:** `src/components/organizations/organization-content.tsx`

Displays detailed information about a selected organization.

**Features:**
- Organization header with name and tag badge
- User's role display
- Member count and creation date
- Quick action cards (View Members, View Events, Settings)
- Join Requests card (Owner/Admin only)
- Recent activity section

---

#### `OrganizationList`
**Location:** `src/components/organizations/organization-list.tsx`

List component showing all user's organizations.

**Features:**
- Organization cards with name and tag
- Member count display
- Role badge for user's role
- Click to select organization

---

#### `CreateOrganizationView`
**Location:** `src/components/organizations/create-organization-view.tsx`

Form for creating new organizations.

**Features:**
- Organization name input (required)
- Description textarea (optional)
- Tag input (optional, validated for uniqueness)
- Error handling for duplicate tags
- Success redirect to dashboard

---

#### `SearchOrganizationsView`
**Location:** `src/components/organizations/search-organizations-view.tsx`

Search and browse all organizations in the system.

**Features:**
- Search input with query parameter
- Filter options (exclude joined organizations)
- Pagination controls
- Organization cards with:
  - Name, description, tag
  - Member count
  - Action buttons (View/Request to Join/Request Pending)
- Join request workflow with pending state tracking

---

#### `JoinRequestsCard`
**Location:** `src/components/organizations/join-requests-card.tsx`

Component for managing join requests (Owner/Admin only).

**Features:**
- List of pending join requests
- User details (name, email, request timestamp)
- Approve button (green)
- Reject button (red)
- Loading states during actions
- Auto-refresh after approve/reject
- Empty state when no requests

---

### Empty State

#### `OrganizationEmptyState`
**Location:** `src/components/organizations/organization-empty-state.tsx`

Displayed when user has no organizations.

**Features:**
- Welcome message
- Create and search organization buttons
- Visual guidance for new users

---

## Types & Interfaces

### Organization Types
**Location:** `src/types/organization.ts`

```typescript
// Organization role within the system
export type OrganizationRole = 'Owner' | 'Admin' | 'Attendance Taker' | 'Member'

// Base organization interface
export interface Organization {
  id: string
  name: string
  description: string | null
  tag: string | null  // Organization abbreviation
  owner_user_id: string
  created_at: string
  updated_at: string
}

// Organization with user's role
export interface OrganizationWithRole extends Organization {
  user_role: OrganizationRole
  member_count?: number
}

// Create organization input
export interface CreateOrganizationInput {
  name: string
  description?: string
  tag?: string
}

// Update organization input
export interface UpdateOrganizationInput {
  name?: string
  description?: string
  tag?: string
}
```

### Join Request Types
**Location:** `src/types/join-request.ts`

```typescript
export type JoinRequestStatus = 'pending' | 'approved' | 'rejected'

export interface JoinRequest {
  id: string
  organization_id: string
  user_id: string
  status: JoinRequestStatus
  requested_at: string
  reviewed_at: string | null
  reviewed_by: string | null
  created_at: string
  updated_at: string
}

export interface JoinRequestWithUser extends JoinRequest {
  user: {
    id: string
    name: string
    email: string
    user_type: string
  }
}
```

---

## Features

### 1. Organization Creation
- Any authenticated user can create an organization
- Creator automatically becomes Owner
- Optional organization tag (unique abbreviation)
- Automatic member entry creation for owner

### 2. Organization Management
- View organization details
- Edit organization info (Owner/Admin only)
- Delete organization (Owner only)
- View member list

### 3. Organization Search
- Full-text search on name and description
- Pagination support
- Filter by member count
- Exclude joined organizations
- Sort by name, date, or member count

### 4. Join Request System
- Users request to join organizations
- Requests appear on organization dashboard for Owner/Admin
- Approve/Reject workflow
- Prevents duplicate requests
- Shows pending state on search page

### 5. Role-Based Access Control
- **Owner**: Full control, can delete organization
- **Admin**: Can manage members, approve requests, edit org
- **Attendance Taker**: Can manage events and attendance
- **Member**: Basic access to view organization

### 6. Organization Tags
- Short abbreviation for organizations (e.g., "FOC")
- Unique across all organizations
- Displayed as badges in UI
- Used in membership tags on user profiles

---

## Security & Permissions

### Permission Matrix

| Action | Owner | Admin | Attendance Taker | Member |
|--------|-------|-------|------------------|--------|
| View Organization | ✅ | ✅ | ✅ | ✅ |
| Edit Organization | ✅ | ✅ | ❌ | ❌ |
| Delete Organization | ✅ | ❌ | ❌ | ❌ |
| Add Members | ✅ | ✅ | ❌ | ❌ |
| Remove Members | ✅ | ✅ | ❌ | ❌ |
| Update Member Roles | ✅ | ✅ | ❌ | ❌ |
| View Join Requests | ✅ | ✅ | ❌ | ❌ |
| Approve/Reject Requests | ✅ | ✅ | ❌ | ❌ |
| Leave Organization | ❌* | ✅ | ✅ | ✅ |

*Owner cannot leave without transferring ownership or deleting organization

### Security Features

1. **Row Level Security (RLS)**
   - All tables have RLS enabled
   - Policies enforce role-based access

2. **Input Validation**
   - Organization names required
   - Tag uniqueness enforced at database level
   - Role validation via CHECK constraints

3. **Authorization Checks**
   - API endpoints verify user permissions
   - Helper functions for role checking
   - Consistent authorization middleware

4. **Data Protection**
   - Cascade deletes for data integrity
   - Automatic timestamp updates
   - Single owner enforcement via triggers

---

## Error Handling

### Common Errors

- **Duplicate Tag**: `Organization tag already exists`
- **Unauthorized**: `You do not have permission to perform this action`
- **Not Found**: `Organization not found`
- **Invalid Role**: `Invalid role. Must be: Owner, Admin, Attendance Taker, or Member`
- **Single Owner**: `Organization must have exactly one owner`

---

## Best Practices

1. **Always validate permissions** before modifying organization data
2. **Use organization tags** for better user experience
3. **Implement proper error handling** for tag conflicts
4. **Check user roles** before displaying admin features
5. **Refresh data** after mutations (create, update, delete)

---

**End of Organization Documentation**
