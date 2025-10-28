# Membership API Reference

Complete API reference for the Membership feature in the NFC Attendance System.

## Base URL

```
/api/membership
```

## Authentication

All endpoints require authentication via Supabase Auth. Include the session token in requests.

---

## Endpoints

### 1. List Memberships

Get memberships with optional filters.

**Endpoint:** `GET /api/membership`

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `user_id` | UUID | No | Filter by user ID |
| `organization_id` | UUID | No | Filter by organization ID |
| `role` | String | No | Filter by role (Owner, Admin, Attendance Taker, Member) |

**Authorization:**
- Users can only view their own memberships unless they have admin access to the organization

**Success Response:** `200 OK`

```json
{
  "memberships": [
    {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "user_id": "123e4567-e89b-12d3-a456-426614174001",
      "organization_id": "123e4567-e89b-12d3-a456-426614174002",
      "role": "Admin",
      "joined_at": "2025-10-28T10:00:00Z",
      "updated_at": "2025-10-28T10:00:00Z"
    }
  ]
}
```

**Error Responses:**
- `401 Unauthorized` - User not authenticated
- `403 Forbidden` - User lacks permission
- `500 Internal Server Error`

**Example:**

```bash
curl -X GET "https://your-domain.com/api/membership?organization_id=org-uuid" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

### 2. Create Membership

Add a user to an organization with a specific role.

**Endpoint:** `POST /api/membership`

**Request Body:**

```json
{
  "user_id": "123e4567-e89b-12d3-a456-426614174001",
  "organization_id": "123e4567-e89b-12d3-a456-426614174002",
  "role": "Member"
}
```

**Body Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `user_id` | UUID | Yes | ID of user to add |
| `organization_id` | UUID | Yes | ID of organization |
| `role` | String | Yes | Role to assign (Admin, Attendance Taker, Member) |

**Authorization:**
- Requesting user must be Admin or Owner of the organization
- Cannot directly assign Owner role

**Success Response:** `201 Created`

```json
{
  "membership": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "user_id": "123e4567-e89b-12d3-a456-426614174001",
    "organization_id": "123e4567-e89b-12d3-a456-426614174002",
    "role": "Member",
    "joined_at": "2025-10-28T10:00:00Z",
    "updated_at": "2025-10-28T10:00:00Z"
  }
}
```

**Error Responses:**
- `400 Bad Request` - Missing fields, user already member, or invalid role
- `401 Unauthorized` - User not authenticated
- `403 Forbidden` - User lacks Admin/Owner permission
- `500 Internal Server Error`

**Example:**

```bash
curl -X POST "https://your-domain.com/api/membership" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "user-uuid",
    "organization_id": "org-uuid",
    "role": "Member"
  }'
```

---

### 3. Get Membership by ID

Retrieve a specific membership with full details.

**Endpoint:** `GET /api/membership/{id}`

**Path Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | UUID | Yes | Membership ID |

**Authorization:**
- User must be the member OR have admin access to the organization

**Success Response:** `200 OK`

```json
{
  "membership": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "user_id": "123e4567-e89b-12d3-a456-426614174001",
    "organization_id": "123e4567-e89b-12d3-a456-426614174002",
    "role": "Admin",
    "joined_at": "2025-10-28T10:00:00Z",
    "updated_at": "2025-10-28T10:00:00Z",
    "organization": {
      "id": "123e4567-e89b-12d3-a456-426614174002",
      "name": "Faculty of Computing",
      "description": "Computing organization",
      "owner_user_id": "123e4567-e89b-12d3-a456-426614174003"
    },
    "user": {
      "id": "123e4567-e89b-12d3-a456-426614174001",
      "name": "John Doe",
      "email": "john@example.com",
      "user_type": "Student",
      "nfc_tag_id": "ABC123"
    }
  }
}
```

**Error Responses:**
- `401 Unauthorized` - User not authenticated
- `403 Forbidden` - User lacks permission
- `404 Not Found` - Membership not found
- `500 Internal Server Error`

---

### 4. Update Membership Role

Change a member's role in an organization.

**Endpoint:** `PATCH /api/membership/{id}`

**Path Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | UUID | Yes | Membership ID |

**Request Body:**

```json
{
  "role": "Admin"
}
```

**Body Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `role` | String | Yes | New role (Admin, Attendance Taker, Member) |

**Authorization:**
- Requesting user must be Admin or Owner
- Cannot change Owner role (use transfer ownership)

**Success Response:** `200 OK`

```json
{
  "membership": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "user_id": "123e4567-e89b-12d3-a456-426614174001",
    "organization_id": "123e4567-e89b-12d3-a456-426614174002",
    "role": "Admin",
    "joined_at": "2025-10-28T10:00:00Z",
    "updated_at": "2025-10-28T10:30:00Z"
  }
}
```

**Error Responses:**
- `400 Bad Request` - Missing role or attempting to change Owner
- `401 Unauthorized` - User not authenticated
- `403 Forbidden` - User lacks Admin/Owner permission
- `404 Not Found` - Membership not found
- `500 Internal Server Error`

**Example:**

```bash
curl -X PATCH "https://your-domain.com/api/membership/membership-uuid" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"role": "Admin"}'
```

---

### 5. Delete Membership

Remove a member from an organization.

**Endpoint:** `DELETE /api/membership/{id}`

**Path Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | UUID | Yes | Membership ID |

**Authorization:**
- Requesting user must be Admin or Owner, OR
- User can remove their own membership (self-leave)
- Cannot remove Owner (must transfer ownership first)

**Success Response:** `200 OK`

```json
{
  "message": "Membership removed successfully"
}
```

**Error Responses:**
- `400 Bad Request` - Attempting to remove Owner
- `401 Unauthorized` - User not authenticated
- `403 Forbidden` - User lacks permission
- `404 Not Found` - Membership not found
- `500 Internal Server Error`

**Example:**

```bash
curl -X DELETE "https://your-domain.com/api/membership/membership-uuid" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

### 6. Get User's Memberships

Retrieve all memberships for a specific user.

**Endpoint:** `GET /api/membership/user/{userId}`

**Path Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `userId` | UUID | Yes | User ID |

**Authorization:**
- Users can only view their own memberships

**Success Response:** `200 OK`

```json
{
  "memberships": [
    {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "user_id": "123e4567-e89b-12d3-a456-426614174001",
      "organization_id": "123e4567-e89b-12d3-a456-426614174002",
      "role": "Admin",
      "joined_at": "2025-10-28T10:00:00Z",
      "updated_at": "2025-10-28T10:00:00Z",
      "organization": {
        "id": "123e4567-e89b-12d3-a456-426614174002",
        "name": "Faculty of Computing",
        "description": "Computing organization",
        "owner_user_id": "123e4567-e89b-12d3-a456-426614174003"
      }
    }
  ]
}
```

**Error Responses:**
- `401 Unauthorized` - User not authenticated
- `403 Forbidden` - User trying to view others' memberships
- `500 Internal Server Error`

**Example:**

```bash
curl -X GET "https://your-domain.com/api/membership/user/user-uuid" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

### 7. Get User's Membership Tags

Get membership tags in "OrganizationName:Role" format.

**Endpoint:** `GET /api/membership/user/{userId}/tags`

**Path Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `userId` | UUID | Yes | User ID |

**Authorization:**
- Users can only view their own tags

**Success Response:** `200 OK`

```json
{
  "tags": [
    {
      "organization_name": "Faculty of Computing",
      "role": "Admin",
      "tag": "Faculty of Computing:Admin"
    },
    {
      "organization_name": "Computer Science Club",
      "role": "Member",
      "tag": "Computer Science Club:Member"
    }
  ]
}
```

**Error Responses:**
- `401 Unauthorized` - User not authenticated
- `403 Forbidden` - User trying to view others' tags
- `500 Internal Server Error`

**Example:**

```bash
curl -X GET "https://your-domain.com/api/membership/user/user-uuid/tags" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

### 8. Get Organization Members

Retrieve all members of a specific organization.

**Endpoint:** `GET /api/membership/organization/{organizationId}`

**Path Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `organizationId` | UUID | Yes | Organization ID |

**Authorization:**
- Requesting user must be a member of the organization

**Success Response:** `200 OK`

```json
{
  "members": [
    {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "user_id": "123e4567-e89b-12d3-a456-426614174001",
      "organization_id": "123e4567-e89b-12d3-a456-426614174002",
      "role": "Owner",
      "joined_at": "2025-10-28T10:00:00Z",
      "updated_at": "2025-10-28T10:00:00Z",
      "user": {
        "id": "123e4567-e89b-12d3-a456-426614174001",
        "name": "Jane Smith",
        "email": "jane@example.com",
        "user_type": "Faculty",
        "nfc_tag_id": "XYZ789"
      }
    }
  ]
}
```

**Error Responses:**
- `401 Unauthorized` - User not authenticated
- `403 Forbidden` - User not a member of the organization
- `500 Internal Server Error`

**Example:**

```bash
curl -X GET "https://your-domain.com/api/membership/organization/org-uuid" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

### 9. Transfer Ownership

Transfer organization ownership to another member.

**Endpoint:** `POST /api/membership/transfer-ownership`

**Request Body:**

```json
{
  "organization_id": "123e4567-e89b-12d3-a456-426614174002",
  "new_owner_id": "123e4567-e89b-12d3-a456-426614174001"
}
```

**Body Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `organization_id` | UUID | Yes | Organization ID |
| `new_owner_id` | UUID | Yes | User ID of new owner |

**Authorization:**
- Requesting user must be current Owner
- New owner must already be a member

**Behavior:**
- Current owner becomes Admin
- New member becomes Owner
- Updates `owner_user_id` in organizations table

**Success Response:** `200 OK`

```json
{
  "message": "Ownership transferred successfully"
}
```

**Error Responses:**
- `400 Bad Request` - Missing fields or new owner not a member
- `401 Unauthorized` - User not authenticated
- `403 Forbidden` - User is not current Owner
- `500 Internal Server Error`

**Example:**

```bash
curl -X POST "https://your-domain.com/api/membership/transfer-ownership" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "organization_id": "org-uuid",
    "new_owner_id": "user-uuid"
  }'
```

---

## Role Definitions

| Role | Level | Permissions |
|------|-------|-------------|
| Owner | 4 | Full control, can transfer ownership, delete org |
| Admin | 3 | Manage members, events, attendance |
| Attendance Taker | 2 | Take attendance, view members |
| Member | 1 | Basic access, view org details |

## Common Error Codes

| Code | Description |
|------|-------------|
| 400 | Bad Request - Invalid input or business rule violation |
| 401 | Unauthorized - User not authenticated |
| 403 | Forbidden - User lacks required permissions |
| 404 | Not Found - Resource doesn't exist |
| 500 | Internal Server Error - Server-side error |

## Rate Limiting

Currently no rate limiting is implemented. Consider adding rate limiting in production.

## Versioning

Current API version: v1 (implicit)

Future versions will use explicit versioning: `/api/v2/membership`

## Support

For issues or questions:
- Check documentation in `/documents` folder
- Review Supabase logs for errors
- Test with Postman or similar tools
