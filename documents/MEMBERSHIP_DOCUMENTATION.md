# Membership Feature Documentation

**Last Updated:** November 1, 2025  
**Status:** ✅ Production Ready

---

## Table of Contents
1. [Overview](#overview)
2. [Database Structure](#database-structure)
3. [API Endpoints](#api-endpoints)
4. [Frontend Integration](#frontend-integration)
5. [Types & Interfaces](#types--interfaces)
6. [Features](#features)
7. [Security & Permissions](#security--permissions)

---

## Overview

The Membership feature manages the relationship between users and organizations. It handles member roles, join requests, approvals, and membership operations within the NFC Attendance System.

### Key Concepts
- **Membership**: Connection between a user and an organization with a specific role
- **Roles**: Owner, Admin, Attendance Taker, Member
- **Join Requests**: Request-based system for users to join organizations
- **Approval Workflow**: Owner/Admin review and approve/reject join requests

---

## Database Structure

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
- `organization_id`: Organization reference
- `user_id`: User reference
- `role`: Member's role in the organization
- `joined_at`: When the user joined
- `updated_at`: Last update timestamp

**Constraints:**
- `PRIMARY KEY`: id
- `UNIQUE`: (organization_id, user_id) - one membership per user per organization
- `CHECK`: role IN ('Owner', 'Admin', 'Attendance Taker', 'Member')
- `FOREIGN KEY`: organization_id → organizations(id) ON DELETE CASCADE
- `FOREIGN KEY`: user_id → users(id) ON DELETE CASCADE

**Indexes:**
- `organization_members_pkey`: PRIMARY KEY on id
- `unique_org_user`: UNIQUE on (organization_id, user_id)
- `idx_org_members_org_id`: On organization_id
- `idx_org_members_user_id`: On user_id
- `idx_org_members_role`: On role
- `idx_org_members_joined_at`: On joined_at DESC
- `idx_organization_members_user_org`: On (user_id, organization_id)
- `idx_organization_members_org_role`: On (organization_id, role)

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
- `user_id`: User requesting to join
- `status`: Request status ('pending', 'approved', 'rejected')
- `requested_at`: Timestamp of request creation
- `reviewed_at`: When request was reviewed (null if pending)
- `reviewed_by`: User ID who reviewed the request
- `created_at`: Record creation timestamp
- `updated_at`: Last update timestamp

**Constraints:**
- `PRIMARY KEY`: id
- `CHECK`: status IN ('pending', 'approved', 'rejected')
- `UNIQUE`: (organization_id, user_id, status)
- `FOREIGN KEY`: organization_id → organizations(id) ON DELETE CASCADE
- `FOREIGN KEY`: user_id → users(id) ON DELETE CASCADE
- `FOREIGN KEY`: reviewed_by → users(id)

**Purpose of UNIQUE constraint:**
- Prevents duplicate pending requests from same user to same org
- Allows viewing request history (approved/rejected remain in table)
- User can only have one pending request at a time per organization

---

## Row Level Security (RLS) Policies

### Organization Members Table Policies

1. **`Owners and Admins can add members`** (INSERT)
   - Only Owners and Admins can add new members
   - Uses EXISTS subquery to check requester's role

2. **`admins_can_add_members`** (INSERT)
   - Function-based policy for adding members
   - Checks via `is_org_admin()` or `is_org_owner()`

3. **`Users can view their own memberships`** (SELECT)
   - Users can see organizations they belong to
   - Checks: `auth.uid() = user_id`

4. **`members_can_view_other_members`** (SELECT)
   - Organization members can view other members
   - Uses `is_org_member()` function

5. **`Owners and Admins can update members`** (UPDATE)
   - Can modify member roles
   - Cannot remove Owner role (prevented by trigger)

6. **`admins_can_update_members`** (UPDATE)
   - Function-based update policy

7. **`Users can leave organizations`** (DELETE)
   - Members can remove themselves
   - Exception: Owners cannot leave (must transfer or delete org)

8. **`Owners and Admins can remove members`** (DELETE)
   - Can remove other members
   - Cannot remove Owner

9. **`admins_can_remove_members`** (DELETE)
   - Function-based delete policy

---

### Organization Join Requests Table Policies

1. **`Users can create join requests`** (INSERT)
   - Any authenticated user can request to join an organization
   - Checks: `auth.uid() = user_id`
   - Prevents duplicate pending requests via UNIQUE constraint

2. **`Users can view their own requests`** (SELECT)
   - Users can see their join requests
   - Checks: `auth.uid() = user_id`

3. **`Admins can view join requests`** (SELECT)
   - Owners/Admins can see pending requests for their organizations
   - Uses organization membership check

4. **`Admins can update join requests`** (UPDATE)
   - Owners/Admins can approve/reject requests
   - Used for marking as approved/rejected

---

## Database Functions

### Membership Functions

```sql
-- Check if user is organization member
is_org_member(org_id uuid, user_auth_id uuid) → boolean
  -- Returns true if user is a member of the organization

-- Check if user is organization admin (Admin or Owner role)
is_org_admin(org_id uuid, user_auth_id uuid) → boolean
  -- Returns true if user has Admin or Owner role

-- Check if user is organization owner
is_org_owner(org_id uuid, user_auth_id uuid) → boolean
  -- Returns true if user has Owner role

-- Get user's role in organization
get_user_role_in_organization(p_user_id uuid, p_organization_id uuid) → text
  -- Returns the role name or null if not a member

-- Check if user has specific role
user_has_role(p_user_id uuid, p_organization_id uuid, p_role text) → boolean
  -- Returns true if user has the specified role

-- Check if user has permission (role hierarchy check)
user_has_permission(p_user_id uuid, p_organization_id uuid, p_required_role text) → boolean
  -- Returns true if user has required role or higher

-- Approve join request and create membership
approve_join_request(p_request_id uuid, p_reviewer_id uuid) → boolean
  -- Creates membership record with 'Member' role
  -- Updates request status to 'approved'
  -- Records reviewer and review timestamp
  -- Returns true on success
  -- Uses SECURITY DEFINER to bypass RLS
```

### Single Owner Enforcement

```sql
-- Ensure only one Owner per organization
check_single_owner() → trigger
  -- Prevents multiple Owners
  -- Enforces on INSERT and UPDATE
  -- Raises exception if violation detected
```

---

## API Endpoints

### Membership Management

#### `GET /api/membership`
Get memberships with optional filters.

**Query Parameters:**
- `organization_id`: Filter by organization
- `user_id`: Filter by user
- `role`: Filter by role

**Response:**
```typescript
{
  memberships: Array<OrganizationMember>
}
```

---

#### `GET /api/membership/[id]`
Get membership details by ID.

**Response:**
```typescript
{
  membership: OrganizationMember & {
    user: UserBasicInfo
    organization: OrganizationBasicInfo
  }
}
```

---

#### `PUT /api/membership/[id]`
Update member role (Owner/Admin only).

**Request Body:**
```typescript
{
  role: OrganizationRole  // 'Owner' | 'Admin' | 'Attendance Taker' | 'Member'
}
```

**Response:**
```typescript
{
  membership: OrganizationMember
}
```

**Restrictions:**
- Cannot change Owner role (use transfer ownership instead)
- Requester must be Owner or Admin
- Cannot modify own Owner role

---

#### `DELETE /api/membership/[id]`
Remove a member (Owner/Admin only, or self-removal).

**Response:**
```typescript
{
  message: "Membership removed successfully"
}
```

**Rules:**
- Members can remove themselves (leave organization)
- Owners/Admins can remove other members
- Cannot remove Owner (must transfer or delete org)

---

#### `GET /api/membership/user/[userId]`
Get all memberships for a specific user.

**Response:**
```typescript
{
  memberships: Array<OrganizationMember & {
    organization: Organization
  }>
}
```

**Authorization:**
- Users can view their own memberships
- Admins can view memberships for permission checks

---

### Join Request Endpoints

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

**Validation:**
- User cannot already be a member
- User cannot have a pending request
- Organization must exist

---

#### `GET /api/organization/[id]/join-requests`
Get pending join requests for organization (Owner/Admin only).

**Response:**
```typescript
{
  requests: Array<JoinRequestWithUser>
}
```

**Returned Data:**
- Request details (id, status, timestamps)
- User information (name, email, user_type)
- Sorted by requested_at (newest first)

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

**Process:**
1. Validates request exists and is pending
2. Checks approver has Owner/Admin role
3. Calls `approve_join_request()` database function
4. Creates membership with 'Member' role
5. Updates request status to 'approved'
6. Records reviewer and timestamp

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

**Process:**
1. Validates request exists and is pending
2. Checks rejecter has Owner/Admin role
3. Updates request status to 'rejected'
4. Records reviewer and timestamp

---

## Frontend Integration

### Membership Display

#### User Profile Memberships
**Location:** `src/components/profile-page.tsx`

Displays user's organization memberships with tags.

**Format:**
- Member role: Shows just the tag (e.g., "FOC")
- Elevated roles: Shows tag with role (e.g., "FOC: Admin", "FOC: Owner")

**Implementation:**
```typescript
const formatMembershipTag = (membership: MembershipWithOrg) => {
  const tag = membership.organization.tag || membership.organization.name
  if (membership.role === 'Member') {
    return tag
  }
  return `${tag}: ${membership.role}`
}
```

---

#### Organization Dashboard
**Location:** `src/components/organizations/organization-content.tsx`

Shows user's role in the organization header.

**Features:**
- Role badge display
- Conditional rendering of admin features
- Join requests card (Owner/Admin only)

---

### Join Request UI

#### Search Page
**Location:** `src/components/organizations/search-organizations-view.tsx`

Handles join request creation and status display.

**Button States:**
1. **Member**: "View" button (user is already a member)
2. **Pending Request**: "Request Pending" button (disabled, orange)
3. **Not Member**: "Request to Join" button (primary action)

**State Management:**
```typescript
const [pendingRequests, setPendingRequests] = useState<Set<string>>(new Set())

// Track pending requests from API
data.results?.forEach((org: any) => {
  if (org.has_pending_request) {
    pending.add(org.id)
  }
})

// Add to set after successful request
setPendingRequests(prev => new Set(prev).add(organizationId))
```

---

#### Join Requests Card
**Location:** `src/components/organizations/join-requests-card.tsx`

Manages join requests for organization owners/admins.

**Features:**
- List pending requests
- Show user details (name, email, request date)
- Approve button (green, adds as Member)
- Reject button (red, declines request)
- Loading states during actions
- Auto-refresh after approve/reject
- Empty state when no requests

**Request Display:**
```typescript
{requests.map((request) => (
  <div key={request.id}>
    <User avatar with name and email />
    <Approve button />
    <Reject button />
  </div>
))}
```

---

## Types & Interfaces

### Membership Types
**Location:** `src/types/membership.ts`

```typescript
// Organization role
export type OrganizationRole = 'Owner' | 'Admin' | 'Attendance Taker' | 'Member'

// Base membership interface
export interface OrganizationMember {
  id: string
  organization_id: string
  user_id: string
  role: OrganizationRole
  joined_at: string
  updated_at: string
}

// Membership with user info
export interface MembershipWithUser extends OrganizationMember {
  user: {
    id: string
    name: string
    email: string
    user_type: string
  }
}

// Membership with organization info
export interface MembershipWithOrganization extends OrganizationMember {
  organization: {
    id: string
    name: string
    tag: string | null
    description: string | null
  }
}

// Create membership input
export interface CreateMembershipInput {
  organization_id: string
  user_id: string
  role: OrganizationRole
}

// Update membership input
export interface UpdateMembershipInput {
  role: OrganizationRole
}
```

### Join Request Types
**Location:** `src/types/join-request.ts`

```typescript
// Join request status
export type JoinRequestStatus = 'pending' | 'approved' | 'rejected'

// Base join request
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

// Join request with user details
export interface JoinRequestWithUser extends JoinRequest {
  user: {
    id: string
    name: string
    email: string
    user_type: string
  }
}

// Join request with organization details
export interface JoinRequestWithOrganization extends JoinRequest {
  organization: {
    id: string
    name: string
    tag: string | null
  }
}

// Create join request input
export interface CreateJoinRequestInput {
  organization_id: string
  user_id: string
}

// Review join request input
export interface ReviewJoinRequestInput {
  request_id: string
  organization_id: string
  action: 'approve' | 'reject'
}
```

---

## Features

### 1. Role-Based Membership

**Role Hierarchy:**
1. **Owner** (Highest authority)
   - One per organization
   - Full control over organization
   - Cannot leave without transfer/delete
   - Can perform all actions

2. **Admin**
   - Can manage members (add, remove, update roles)
   - Can edit organization details
   - Can approve/reject join requests
   - Can manage events
   - Cannot delete organization
   - Can leave organization

3. **Attendance Taker**
   - Can create and manage events
   - Can take attendance
   - Limited admin capabilities
   - Can leave organization

4. **Member** (Base role)
   - Can view organization
   - Can view events
   - Can attend events
   - Can leave organization
   - No management permissions

---

### 2. Join Request System

**Workflow:**
1. User clicks "Request to Join" on organization
2. Request created with status='pending'
3. Request appears in organization dashboard (Owner/Admin only)
4. Owner/Admin reviews request
5. Owner/Admin approves or rejects
6. If approved: User added as Member
7. If rejected: Request marked rejected, user notified

**Features:**
- Prevents duplicate requests (UNIQUE constraint)
- Shows pending state on search page
- Tracks reviewer and timestamps
- Maintains request history (approved/rejected records kept)

---

### 3. Member Management

**Add Members:**
- Owner/Admin can add users directly
- Specify role during addition
- Bypass join request process for invites

**Update Roles:**
- Owner/Admin can change member roles
- Cannot change Owner role (protected)
- Role changes logged with timestamp

**Remove Members:**
- Self-removal: Members can leave anytime
- Admin removal: Owner/Admin can remove members
- Owner cannot be removed (must transfer ownership)
- Cascade deletes: Member removal cascades to related data

---

### 4. Membership Display

**User Profile:**
- Shows all organization memberships
- Displays organization tag or name
- Color-coded role badges
- Format: "TAG" or "TAG: Role"

**Organization Dashboard:**
- Shows user's role in current org
- Role badge in header
- Conditional feature display based on role

**Member List:**
- Shows all organization members
- Role badges for each member
- User details (name, email, user type)
- Joined date

---

## Security & Permissions

### Permission Matrix

| Action | Owner | Admin | Attendance Taker | Member |
|--------|-------|-------|------------------|--------|
| View Members | ✅ | ✅ | ✅ | ✅ |
| Add Members | ✅ | ✅ | ❌ | ❌ |
| Remove Members | ✅ | ✅ | ❌ | ❌ |
| Update Roles | ✅ | ✅ | ❌ | ❌ |
| Leave Org | ❌* | ✅ | ✅ | ✅ |
| View Join Requests | ✅ | ✅ | ❌ | ❌ |
| Approve Requests | ✅ | ✅ | ❌ | ❌ |
| Reject Requests | ✅ | ✅ | ❌ | ❌ |

*Owner cannot leave without transferring ownership or deleting org

---

### Role Enforcement

**Database Level:**
- CHECK constraints on role values
- Triggers for single owner enforcement
- RLS policies for permission checks
- Foreign key cascades for data integrity

**Application Level:**
- API middleware checks permissions
- Frontend conditional rendering
- Helper functions for role validation
- Type-safe role assignments

---

### Join Request Security

**Validations:**
- User cannot join if already member
- User cannot have duplicate pending requests
- Only Owner/Admin can approve/reject
- Request must be 'pending' to be reviewed
- Reviewer ID recorded for audit trail

**RLS Enforcement:**
- Users can only create requests for themselves
- Users can view their own requests
- Admins can view requests for their organizations
- Admins can only update requests for their organizations

---

## Error Handling

### Common Errors

**Membership Errors:**
- `Already a member`: User already belongs to organization
- `Not a member`: User is not part of organization
- `Insufficient permissions`: User lacks required role
- `Cannot remove owner`: Owner must transfer or delete org
- `Single owner violation`: Cannot add second owner

**Join Request Errors:**
- `Already pending`: User has existing pending request
- `Request not found`: Invalid request ID
- `Request not pending`: Request already processed
- `Not authorized`: Requester not Owner/Admin
- `Organization not found`: Invalid organization ID

---

## Best Practices

1. **Always check permissions** before membership operations
2. **Use database functions** for complex permission checks
3. **Validate role hierarchy** when updating roles
4. **Track request history** (keep approved/rejected records)
5. **Display clear status** on join buttons (member/pending/available)
6. **Use transactions** for multi-step operations (approve request)
7. **Refresh data** after mutations (add, remove, update)
8. **Show role badges** for clear permission indication
9. **Prevent duplicate requests** with database constraints
10. **Audit actions** by recording reviewer IDs and timestamps

---

## Integration Points

### With Organization Feature
- Memberships link users to organizations
- Roles determine organization permissions
- Member count displayed on organization cards
- Join requests managed from organization dashboard

### With User Feature
- Memberships displayed on user profiles
- User type independent of organization role
- Membership tags show organization abbreviations

### With Event Feature
- Member role required to view events
- Attendance Taker role can manage events
- Owner/Admin can create and manage events

---

**End of Membership Documentation**
