# Events API Reference - NFC Attendance System

This document provides a comprehensive guide to the Events API endpoints.

## Overview

The Events API allows you to manage events within organizations. Events are activities hosted by organizations that members can attend and track attendance for.

## Base URL

All API endpoints are relative to: `/api`

## Authentication

All endpoints require authentication via Supabase session cookies. Unauthorized requests will return a `401 Unauthorized` response.

---

## Endpoints

### 1. Get All Events for Current User

**GET** `/api/event`

Get all events from organizations where the current user is a member.

#### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `organization_id` | string (UUID) | No | Filter events by organization |
| `from_date` | string (ISO 8601) | No | Filter events from this date onwards |
| `to_date` | string (ISO 8601) | No | Filter events up to this date |
| `search` | string | No | Search events by name, description, or location |
| `upcoming` | boolean | No | Get only upcoming events (future dates) |
| `past` | boolean | No | Get only past events |
| `limit` | number | No | Limit results (used with `upcoming` or `past`) |

#### Response

```json
[
  {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "event_name": "Team Meeting",
    "date": "2025-11-15T14:00:00.000Z",
    "organization_id": "123e4567-e89b-12d3-a456-426614174001",
    "description": "Monthly team sync meeting",
    "location": "Conference Room A",
    "created_by": "123e4567-e89b-12d3-a456-426614174002",
    "created_at": "2025-10-28T10:00:00.000Z",
    "updated_at": "2025-10-28T10:00:00.000Z",
    "organization": {
      "id": "123e4567-e89b-12d3-a456-426614174001",
      "name": "Tech Club"
    }
  }
]
```

#### Example Requests

```bash
# Get all events for current user
GET /api/event

# Get upcoming events
GET /api/event?upcoming=true&limit=10

# Get events for a specific organization
GET /api/event?organization_id=123e4567-e89b-12d3-a456-426614174001

# Search events
GET /api/event?search=meeting

# Get events in date range
GET /api/event?from_date=2025-11-01&to_date=2025-11-30
```

---

### 2. Create an Event

**POST** `/api/event`

Create a new event. Only users with Owner, Admin, or Attendance Taker roles can create events.

#### Request Body

```json
{
  "event_name": "Team Meeting",
  "date": "2025-11-15T14:00:00.000Z",
  "organization_id": "123e4567-e89b-12d3-a456-426614174001",
  "description": "Monthly team sync meeting",
  "location": "Conference Room A"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `event_name` | string | Yes | Name of the event |
| `date` | string (ISO 8601) | Yes | Date and time of the event |
| `organization_id` | string (UUID) | Yes | Organization hosting the event |
| `description` | string | No | Event description |
| `location` | string | No | Event location |

#### Response

**Status:** `201 Created`

```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "event_name": "Team Meeting",
  "date": "2025-11-15T14:00:00.000Z",
  "organization_id": "123e4567-e89b-12d3-a456-426614174001",
  "description": "Monthly team sync meeting",
  "location": "Conference Room A",
  "created_by": "123e4567-e89b-12d3-a456-426614174002",
  "created_at": "2025-10-28T10:00:00.000Z",
  "updated_at": "2025-10-28T10:00:00.000Z"
}
```

#### Error Responses

- `400 Bad Request` - Missing required fields or invalid data
- `403 Forbidden` - User doesn't have permission to create events
- `404 Not Found` - User profile not found

---

### 3. Get Event by ID

**GET** `/api/event/[id]`

Get details of a specific event by its ID.

#### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Event ID |

#### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `details` | boolean | No | Include organization and creator details |

#### Response

```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "event_name": "Team Meeting",
  "date": "2025-11-15T14:00:00.000Z",
  "organization_id": "123e4567-e89b-12d3-a456-426614174001",
  "description": "Monthly team sync meeting",
  "location": "Conference Room A",
  "created_by": "123e4567-e89b-12d3-a456-426614174002",
  "created_at": "2025-10-28T10:00:00.000Z",
  "updated_at": "2025-10-28T10:00:00.000Z"
}
```

#### With Details (`?details=true`)

```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "event_name": "Team Meeting",
  "date": "2025-11-15T14:00:00.000Z",
  "organization_id": "123e4567-e89b-12d3-a456-426614174001",
  "description": "Monthly team sync meeting",
  "location": "Conference Room A",
  "created_by": "123e4567-e89b-12d3-a456-426614174002",
  "created_at": "2025-10-28T10:00:00.000Z",
  "updated_at": "2025-10-28T10:00:00.000Z",
  "organization": {
    "id": "123e4567-e89b-12d3-a456-426614174001",
    "name": "Tech Club"
  },
  "created_by_user": {
    "id": "123e4567-e89b-12d3-a456-426614174002",
    "name": "John Doe",
    "email": "john@example.com"
  }
}
```

---

### 4. Update an Event

**PUT** `/api/event/[id]`

Update an existing event. Only users with Owner, Admin, or Attendance Taker roles can update events.

#### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Event ID |

#### Request Body

All fields are optional. Only provide fields you want to update.

```json
{
  "event_name": "Updated Team Meeting",
  "date": "2025-11-15T15:00:00.000Z",
  "description": "Updated description",
  "location": "Conference Room B"
}
```

#### Response

```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "event_name": "Updated Team Meeting",
  "date": "2025-11-15T15:00:00.000Z",
  "organization_id": "123e4567-e89b-12d3-a456-426614174001",
  "description": "Updated description",
  "location": "Conference Room B",
  "created_by": "123e4567-e89b-12d3-a456-426614174002",
  "created_at": "2025-10-28T10:00:00.000Z",
  "updated_at": "2025-10-28T15:30:00.000Z"
}
```

#### Error Responses

- `400 Bad Request` - Invalid data format
- `403 Forbidden` - User doesn't have permission to update events
- `404 Not Found` - Event or user profile not found

---

### 5. Delete an Event

**DELETE** `/api/event/[id]`

Delete an event. Only users with Owner or Admin roles can delete events.

#### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Event ID |

#### Response

```json
{
  "success": true,
  "message": "Event deleted successfully"
}
```

#### Error Responses

- `403 Forbidden` - User doesn't have permission to delete events
- `404 Not Found` - Event or user profile not found

---

### 6. Get Organization Events

**GET** `/api/organization/[id]/events`

Get all events for a specific organization.

#### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Organization ID |

#### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `from_date` | string (ISO 8601) | No | Filter events from this date onwards |
| `to_date` | string (ISO 8601) | No | Filter events up to this date |
| `search` | string | No | Search events by name, description, or location |

#### Response

```json
{
  "events": [
    {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "event_name": "Team Meeting",
      "date": "2025-11-15T14:00:00.000Z",
      "organization_id": "123e4567-e89b-12d3-a456-426614174001",
      "description": "Monthly team sync meeting",
      "location": "Conference Room A",
      "created_by": "123e4567-e89b-12d3-a456-426614174002",
      "created_at": "2025-10-28T10:00:00.000Z",
      "updated_at": "2025-10-28T10:00:00.000Z"
    }
  ],
  "count": 1,
  "organization_id": "123e4567-e89b-12d3-a456-426614174001"
}
```

---

## Permissions

Events follow a role-based permission system:

| Action | Owner | Admin | Attendance Taker | Member |
|--------|-------|-------|------------------|--------|
| View events | ✅ | ✅ | ✅ | ✅ |
| Create events | ✅ | ✅ | ✅ | ❌ |
| Update events | ✅ | ✅ | ✅ | ❌ |
| Delete events | ✅ | ✅ | ❌ | ❌ |

## Error Handling

All endpoints follow a consistent error response format:

```json
{
  "error": "Error message describing what went wrong"
}
```

### Common Status Codes

- `200 OK` - Request successful
- `201 Created` - Resource created successfully
- `400 Bad Request` - Invalid request data
- `401 Unauthorized` - Authentication required
- `403 Forbidden` - Insufficient permissions
- `404 Not Found` - Resource not found
- `500 Internal Server Error` - Server error

## Data Types

### Event Object

```typescript
{
  id: string                 // UUID
  event_name: string         // Event name
  date: string               // ISO 8601 timestamp
  organization_id: string    // UUID
  description: string | null // Event description
  location: string | null    // Event location
  created_by: string         // User ID (UUID)
  created_at: string         // ISO 8601 timestamp
  updated_at: string         // ISO 8601 timestamp
}
```

### EventWithOrganization Object

Extends Event with organization details:

```typescript
{
  ...Event,
  organization: {
    id: string     // UUID
    name: string   // Organization name
  }
}
```

### EventWithDetails Object

Extends Event with organization and creator details:

```typescript
{
  ...Event,
  organization: {
    id: string     // UUID
    name: string   // Organization name
  },
  created_by_user: {
    id: string     // UUID
    name: string   // User name
    email: string  // User email
  }
}
```

## Best Practices

1. **Date Handling**: Always use ISO 8601 format for dates. Include timezone information.
2. **Filtering**: Use query parameters to filter and search events efficiently.
3. **Permissions**: Check user permissions before attempting to create, update, or delete events.
4. **Error Handling**: Always handle error responses appropriately in your client code.
5. **Pagination**: For large result sets, consider implementing pagination using `limit` with date ranges.

## Examples

### JavaScript/TypeScript Client

```typescript
// Create an event
const createEvent = async (eventData) => {
  const response = await fetch('/api/event', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(eventData),
  })
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error)
  }
  
  return response.json()
}

// Get upcoming events
const getUpcomingEvents = async (limit = 10) => {
  const response = await fetch(`/api/event?upcoming=true&limit=${limit}`)
  
  if (!response.ok) {
    throw new Error('Failed to fetch events')
  }
  
  return response.json()
}

// Update an event
const updateEvent = async (eventId, updates) => {
  const response = await fetch(`/api/event/${eventId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(updates),
  })
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error)
  }
  
  return response.json()
}

// Delete an event
const deleteEvent = async (eventId) => {
  const response = await fetch(`/api/event/${eventId}`, {
    method: 'DELETE',
  })
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error)
  }
  
  return response.json()
}
```

## Testing

You can test these endpoints using tools like:
- **Postman** or **Insomnia** for API testing
- **cURL** for command-line testing
- **Browser DevTools** for debugging

Example cURL commands:

```bash
# Get all events
curl -X GET http://localhost:3000/api/event \
  -H "Cookie: your-session-cookie"

# Create an event
curl -X POST http://localhost:3000/api/event \
  -H "Content-Type: application/json" \
  -H "Cookie: your-session-cookie" \
  -d '{
    "event_name": "Team Meeting",
    "date": "2025-11-15T14:00:00.000Z",
    "organization_id": "123e4567-e89b-12d3-a456-426614174001",
    "description": "Monthly team sync"
  }'
```

## Related Documentation

- [Events Backend Setup](./EVENTS_BACKEND_SETUP.md) - Database schema and setup
- [Organization API Reference](./ORGANIZATION_API_REFERENCE.md) - Organization endpoints
- [User Backend Setup](./USER_BACKEND_SETUP.md) - User management

---

Last updated: October 28, 2025
