# Membership Feature Documentation

## Overview

The Membership feature manages the relationship between users and organizations. Each membership acts as a "tag" that connects a user to an organization with a specific role (e.g., `FOC:Admin`, `CSC:Member`).

## Database Schema

The membership feature uses the `organization_members` table in Supabase:

### Table: `organization_members`

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `user_id` | UUID | Foreign key to `users` table |
| `organization_id` | UUID | Foreign key to `organizations` table |
| `role` | TEXT | Role in organization (Owner, Admin, Attendance Taker, Member) |
| `joined_at` | TIMESTAMP | When user joined organization |
| `updated_at` | TIMESTAMP | Last update timestamp |

### Constraints

- **Unique constraint**: (`user_id`, `organization_id`) - A user can only have one membership per organization
- **Foreign keys**:
  - `user_id` references `users(id)` ON DELETE CASCADE
  - `organization_id` references `organizations(id)` ON DELETE CASCADE

## Role Hierarchy

The system implements a permission hierarchy:

1. **Owner** (Highest) - Full control, can transfer ownership
2. **Admin** - Can manage members and settings
3. **Attendance Taker** - Can take attendance at events
4. **Member** (Lowest) - Basic access

## API Endpoints

### 1. Get Memberships with Filters

```
GET /api/membership?user_id={userId}&organization_id={orgId}&role={role}
```

**Query Parameters:**
- `user_id` (optional): Filter by user ID
- `organization_id` (optional): Filter by organization ID
- `role` (optional): Filter by role

**Response:**
```json
{
  "memberships": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "organization_id": "uuid",
      "role": "Admin",
      "joined_at": "2025-10-28T10:00:00Z",
      "updated_at": "2025-10-28T10:00:00Z"
    }
  ]
}
```

### 2. Create Membership (Add Member)

```
POST /api/membership
```

**Body:**
```json
{
  "user_id": "uuid",
  "organization_id": "uuid",
  "role": "Member"
}
```

**Requirements:**
- Requesting user must be Admin or Owner of the organization
- Cannot directly assign Owner role (use transfer ownership)
- User cannot already be a member

**Response:**
```json
{
  "membership": {
    "id": "uuid",
    "user_id": "uuid",
    "organization_id": "uuid",
    "role": "Member",
    "joined_at": "2025-10-28T10:00:00Z",
    "updated_at": "2025-10-28T10:00:00Z"
  }
}
```

### 3. Get Membership by ID

```
GET /api/membership/{id}
```

**Response:**
```json
{
  "membership": {
    "id": "uuid",
    "user_id": "uuid",
    "organization_id": "uuid",
    "role": "Admin",
    "joined_at": "2025-10-28T10:00:00Z",
    "updated_at": "2025-10-28T10:00:00Z",
    "organization": {
      "id": "uuid",
      "name": "FOC",
      "description": "Faculty of Computing",
      "owner_user_id": "uuid"
    },
    "user": {
      "id": "uuid",
      "name": "John Doe",
      "email": "john@example.com",
      "user_type": "Student",
      "nfc_tag_id": "ABC123"
    }
  }
}
```

### 4. Update Membership Role

```
PATCH /api/membership/{id}
```

**Body:**
```json
{
  "role": "Admin"
}
```

**Requirements:**
- Requesting user must be Admin or Owner
- Cannot change Owner role (use transfer ownership)

**Response:**
```json
{
  "membership": {
    "id": "uuid",
    "user_id": "uuid",
    "organization_id": "uuid",
    "role": "Admin",
    "joined_at": "2025-10-28T10:00:00Z",
    "updated_at": "2025-10-28T10:30:00Z"
  }
}
```

### 5. Remove Membership

```
DELETE /api/membership/{id}
```

**Requirements:**
- Requesting user must be Admin or Owner, OR
- User can remove their own membership (leave organization)
- Cannot remove Owner (must transfer ownership first)

**Response:**
```json
{
  "message": "Membership removed successfully"
}
```

### 6. Get User's Memberships

```
GET /api/membership/user/{userId}
```

**Response:**
```json
{
  "memberships": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "organization_id": "uuid",
      "role": "Admin",
      "joined_at": "2025-10-28T10:00:00Z",
      "updated_at": "2025-10-28T10:00:00Z",
      "organization": {
        "id": "uuid",
        "name": "FOC",
        "description": "Faculty of Computing",
        "owner_user_id": "uuid"
      }
    }
  ]
}
```

### 7. Get User's Membership Tags

```
GET /api/membership/user/{userId}/tags
```

**Response:**
```json
{
  "tags": [
    {
      "organization_name": "FOC",
      "role": "Admin",
      "tag": "FOC:Admin"
    },
    {
      "organization_name": "CSC",
      "role": "Member",
      "tag": "CSC:Member"
    }
  ]
}
```

### 8. Get Organization Members

```
GET /api/membership/organization/{organizationId}
```

**Requirements:**
- Requesting user must be a member of the organization

**Response:**
```json
{
  "members": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "organization_id": "uuid",
      "role": "Owner",
      "joined_at": "2025-10-28T10:00:00Z",
      "updated_at": "2025-10-28T10:00:00Z",
      "user": {
        "id": "uuid",
        "name": "Jane Smith",
        "email": "jane@example.com",
        "user_type": "Faculty",
        "nfc_tag_id": "XYZ789"
      }
    }
  ]
}
```

### 9. Transfer Ownership

```
POST /api/membership/transfer-ownership
```

**Body:**
```json
{
  "organization_id": "uuid",
  "new_owner_id": "uuid"
}
```

**Requirements:**
- Requesting user must be current Owner
- New owner must already be a member

**Response:**
```json
{
  "message": "Ownership transferred successfully"
}
```

## Service Layer Methods

The `MembershipService` class provides the following methods:

### CRUD Operations
- `createMembership(input)` - Create new membership
- `getMembershipById(id)` - Get membership by ID
- `getMembershipWithOrganization(id)` - Get membership with org details
- `getMembershipWithUser(id)` - Get membership with user details
- `getMembershipWithDetails(id)` - Get membership with full details
- `updateMembership(id, input)` - Update membership role
- `deleteMembership(id)` - Remove membership

### Query Operations
- `getMemberships(filters?)` - Get all memberships with filters
- `getUserMemberships(userId)` - Get user's memberships
- `getOrganizationMembers(orgId)` - Get organization members
- `getUserMembershipInOrganization(userId, orgId)` - Get specific membership
- `countMemberships(filters?)` - Count memberships

### Permission Operations
- `userHasRole(userId, orgId, role)` - Check if user has specific role
- `userHasPermission(userId, orgId, requiredRole)` - Check permission level
- `getUserMembershipTags(userId)` - Get membership tags

### Bulk Operations
- `bulkCreateMemberships(inputs[])` - Create multiple memberships
- `transferOwnership(orgId, currentOwnerId, newOwnerId)` - Transfer ownership

## TypeScript Types

```typescript
export type MembershipRole = 'Owner' | 'Admin' | 'Attendance Taker' | 'Member'

export interface Membership {
  id: string
  user_id: string
  organization_id: string
  role: MembershipRole
  joined_at: string
  updated_at: string
}

export interface MembershipWithOrganization extends Membership {
  organization: {
    id: string
    name: string
    description: string | null
    owner_user_id: string
  }
}

export interface MembershipWithUser extends Membership {
  user: {
    id: string
    name: string
    email: string
    user_type: string
    nfc_tag_id: string | null
  }
}

export interface CreateMembershipInput {
  user_id: string
  organization_id: string
  role: MembershipRole
}

export interface UpdateMembershipInput {
  role?: MembershipRole
}

export interface MembershipTag {
  organization_name: string
  role: MembershipRole
  tag: string // Format: "OrganizationName:Role"
}
```

## Usage Examples

### Adding a Member to Organization

```typescript
import { MembershipService } from '@/lib/services/membership.service'

// Add a user as a member
const membership = await MembershipService.createMembership({
  user_id: 'user-uuid',
  organization_id: 'org-uuid',
  role: 'Member'
})
```

### Checking User Permissions

```typescript
// Check if user has admin access
const hasAccess = await MembershipService.userHasPermission(
  'user-uuid',
  'org-uuid',
  'Admin'
)

if (hasAccess) {
  // User has Admin or Owner role
}
```

### Getting User's Membership Tags

```typescript
const tags = await MembershipService.getUserMembershipTags('user-uuid')
// Result: [{ organization_name: 'FOC', role: 'Admin', tag: 'FOC:Admin' }, ...]
```

### Updating a Member's Role

```typescript
const updated = await MembershipService.updateMembership('membership-uuid', {
  role: 'Admin'
})
```

### Transferring Ownership

```typescript
const success = await MembershipService.transferOwnership(
  'org-uuid',
  'current-owner-uuid',
  'new-owner-uuid'
)
```

## Permission Model

The permission system follows these rules:

1. **Owners** can:
   - Do everything Admins can
   - Transfer ownership
   - Delete the organization

2. **Admins** can:
   - Add/remove members (except Owner)
   - Change member roles (except Owner)
   - Manage events and attendance

3. **Attendance Takers** can:
   - Take attendance at events
   - View member lists

4. **Members** can:
   - View organization details
   - View events
   - Leave organization (remove their own membership)

## Error Handling

Common errors and their meanings:

- `401 Unauthorized` - User not authenticated
- `403 Forbidden` - User lacks required permissions
- `404 Not Found` - Membership or organization not found
- `400 Bad Request` - Invalid input or business rule violation
- `500 Internal Server Error` - Server-side error

## Security Considerations

1. **Authentication**: All endpoints require authenticated users
2. **Authorization**: Role-based access control is enforced
3. **Ownership Protection**: Owner role cannot be directly modified
4. **Self-Management**: Users can always leave organizations (except Owners)
5. **Cascade Deletes**: Memberships are deleted when user or organization is deleted
