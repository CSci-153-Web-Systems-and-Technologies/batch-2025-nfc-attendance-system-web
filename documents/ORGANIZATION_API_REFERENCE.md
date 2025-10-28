# Organization API Reference

Complete API documentation for the Organization backend.

## 🔑 Authentication

All endpoints require authentication via Supabase Auth. Include the session cookie in requests.

## 📚 Endpoints

### Organizations

#### Create Organization
```
POST /api/organization
```

**Request Body:**
```json
{
  "name": "Tech Club",
  "description": "Student technology organization" // optional
}
```

**Response (201):**
```json
{
  "message": "Organization created successfully",
  "organization": {
    "id": "uuid",
    "name": "Tech Club",
    "description": "Student technology organization",
    "owner_user_id": "uuid",
    "created_at": "2025-10-28T...",
    "updated_at": "2025-10-28T...",
    "user_role": "Owner"
  }
}
```

---

#### List User's Organizations
```
GET /api/organization
```

**Response (200):**
```json
{
  "organizations": [
    {
      "id": "uuid",
      "name": "Tech Club",
      "description": "Student technology organization",
      "owner_user_id": "uuid",
      "created_at": "2025-10-28T...",
      "updated_at": "2025-10-28T...",
      "user_role": "Owner",
      "member_count": 15
    }
  ],
  "count": 1
}
```

---

#### Get Organization Details
```
GET /api/organization/[id]
```

**Response (200):**
```json
{
  "organization": {
    "id": "uuid",
    "name": "Tech Club",
    "description": "Student technology organization",
    "owner_user_id": "uuid",
    "created_at": "2025-10-28T...",
    "updated_at": "2025-10-28T...",
    "user_role": "Admin",
    "member_count": 15
  }
}
```

---

#### Update Organization
```
PUT /api/organization/[id]
```

**Permissions:** Owner or Admin

**Request Body:**
```json
{
  "name": "Updated Tech Club", // optional
  "description": "New description" // optional
}
```

**Response (200):**
```json
{
  "message": "Organization updated successfully",
  "organization": {
    "id": "uuid",
    "name": "Updated Tech Club",
    "description": "New description",
    "owner_user_id": "uuid",
    "created_at": "2025-10-28T...",
    "updated_at": "2025-10-28T..."
  }
}
```

---

#### Delete Organization
```
DELETE /api/organization/[id]
```

**Permissions:** Owner only

**Response (200):**
```json
{
  "message": "Organization deleted successfully"
}
```

---

### Members

#### List Organization Members
```
GET /api/organization/[id]/members
```

**Permissions:** Any member

**Response (200):**
```json
{
  "members": [
    {
      "id": "uuid",
      "organization_id": "uuid",
      "user_id": "uuid",
      "role": "Owner",
      "joined_at": "2025-10-28T...",
      "updated_at": "2025-10-28T...",
      "user": {
        "id": "uuid",
        "name": "John Doe",
        "email": "john@example.com",
        "user_type": "Student"
      }
    }
  ],
  "count": 15
}
```

---

#### Add Member
```
POST /api/organization/[id]/members
```

**Permissions:** Owner or Admin

**Request Body (Option 1 - by user_id):**
```json
{
  "user_id": "uuid",
  "role": "Member"
}
```

**Request Body (Option 2 - by email):**
```json
{
  "email": "newmember@example.com",
  "role": "Attendance Taker"
}
```

**Valid Roles:**
- `Owner` (only owner can assign this)
- `Admin`
- `Attendance Taker`
- `Member`

**Response (201):**
```json
{
  "message": "Member added successfully",
  "member": {
    "id": "uuid",
    "organization_id": "uuid",
    "user_id": "uuid",
    "role": "Member",
    "joined_at": "2025-10-28T...",
    "updated_at": "2025-10-28T...",
    "user": {
      "id": "uuid",
      "name": "Jane Smith",
      "email": "jane@example.com",
      "user_type": "Student"
    }
  }
}
```

---

#### Get Member Details
```
GET /api/organization/[id]/members/[userId]
```

**Permissions:** Any member

**Response (200):**
```json
{
  "member": {
    "id": "uuid",
    "organization_id": "uuid",
    "user_id": "uuid",
    "role": "Admin",
    "joined_at": "2025-10-28T...",
    "updated_at": "2025-10-28T...",
    "user": {
      "id": "uuid",
      "name": "Jane Smith",
      "email": "jane@example.com",
      "user_type": "Faculty"
    }
  }
}
```

---

#### Update Member Role
```
PATCH /api/organization/[id]/members/[userId]
```

**Permissions:** Owner or Admin

**Request Body:**
```json
{
  "role": "Admin"
}
```

**Response (200):**
```json
{
  "message": "Member role updated successfully",
  "member": {
    "id": "uuid",
    "organization_id": "uuid",
    "user_id": "uuid",
    "role": "Admin",
    "joined_at": "2025-10-28T...",
    "updated_at": "2025-10-28T...",
    "user": {
      "id": "uuid",
      "name": "Jane Smith",
      "email": "jane@example.com",
      "user_type": "Faculty"
    }
  }
}
```

**Notes:**
- Cannot change the owner's role (use transfer ownership instead)
- Only the owner can assign the "Owner" role

---

#### Remove Member
```
DELETE /api/organization/[id]/members/[userId]
```

**Permissions:** Owner or Admin

**Response (200):**
```json
{
  "message": "Member removed successfully"
}
```

**Notes:**
- Cannot remove the organization owner
- Owner must transfer ownership before leaving

---

### Ownership Transfer

#### Transfer Ownership
```
POST /api/organization/[id]/transfer-ownership
```

**Permissions:** Owner only

**Request Body:**
```json
{
  "new_owner_id": "uuid"
}
```

**Response (200):**
```json
{
  "message": "Ownership transferred successfully",
  "new_owner_id": "uuid"
}
```

**Notes:**
- New owner must already be a member of the organization
- Original owner will remain as a member (role can be changed after transfer)

---

## 🚨 Error Responses

### 400 Bad Request
```json
{
  "error": "Organization name is required"
}
```

### 401 Unauthorized
```json
{
  "error": "Unauthorized"
}
```

### 403 Forbidden
```json
{
  "error": "You do not have permission to perform this action. Required permission: canManageMembers"
}
```

### 404 Not Found
```json
{
  "error": "Organization not found"
}
```

### 409 Conflict
```json
{
  "error": "User is already a member of this organization"
}
```

### 500 Internal Server Error
```json
{
  "error": "Failed to create organization"
}
```

---

## 🎯 Role Permissions

| Permission | Owner | Admin | Attendance Taker | Member |
|------------|-------|-------|------------------|--------|
| View organization | ✅ | ✅ | ✅ | ✅ |
| Update organization | ✅ | ✅ | ❌ | ❌ |
| Delete organization | ✅ | ❌ | ❌ | ❌ |
| View members | ✅ | ✅ | ✅ | ✅ |
| Add members | ✅ | ✅ | ❌ | ❌ |
| Update member roles | ✅ | ✅ | ❌ | ❌ |
| Remove members | ✅ | ✅ | ❌ | ❌ |
| Transfer ownership | ✅ | ❌ | ❌ | ❌ |
| Manage events | ✅ | ✅ | ❌ | ❌ |
| Take attendance | ✅ | ✅ | ✅ | ❌ |
| View attendance | ✅ | ✅ | ✅ | ✅ |

---

## 📝 Example Usage

### Creating an organization and adding members

```javascript
// 1. Create organization
const createResponse = await fetch('/api/organization', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'Computer Science Club',
    description: 'For CS enthusiasts'
  })
});
const { organization } = await createResponse.json();

// 2. Add an admin
await fetch(`/api/organization/${organization.id}/members`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'admin@example.com',
    role: 'Admin'
  })
});

// 3. Add attendance taker
await fetch(`/api/organization/${organization.id}/members`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'scanner@example.com',
    role: 'Attendance Taker'
  })
});

// 4. Get all members
const membersResponse = await fetch(`/api/organization/${organization.id}/members`);
const { members } = await membersResponse.json();
```

---

## 🔗 Related Documentation

- [Supabase Setup](./ORGANIZATION_BACKEND_SETUP.md) - Database schema and RLS policies
- [User Backend Setup](./USER_BACKEND_SETUP.md) - User management system
