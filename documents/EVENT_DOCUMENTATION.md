# Event Feature Documentation

**Last Updated:** November 6, 2025  
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

The Event feature allows organizations to create and manage events within the NFC Attendance System. Events are associated with specific organizations and can be created by users with appropriate permissions (Owner, Admin, or Attendance Taker roles).

### Key Concepts
- **Event**: A scheduled gathering or activity organized by an organization
- **Event Creator**: The user who created the event
- **Event Permissions**: Based on organization membership roles
- **Attendance Tracking**: Events serve as the basis for tracking member attendance (via NFC/QR)

---

## Database Structure

### Table: `events`

```sql
CREATE TABLE events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_name text NOT NULL,
  date timestamp with time zone NOT NULL,
  organization_id uuid NOT NULL,
  description text,
  location text,
  created_by uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);
```

**Columns:**
- `id`: Unique identifier (UUID)
- `event_name`: Name of the event (required)
- `date`: Event date and time (required, with timezone)
- `organization_id`: Reference to the organization hosting the event (required)
- `description`: Optional detailed description of the event
- `location`: Optional location/venue information
- `created_by`: Reference to the user who created the event (required)
- `created_at`: Timestamp when event was created (auto-generated)
- `updated_at`: Timestamp when event was last updated (auto-updated via trigger)

**Constraints:**
- `PRIMARY KEY`: id
- `NOT NULL`: event_name, date, organization_id, created_by, created_at, updated_at
- `FOREIGN KEY`: organization_id → organizations(id) ON DELETE CASCADE
- `FOREIGN KEY`: created_by → users(id) ON DELETE CASCADE
- `CHECK`: event_name length between 3-200 characters (added Nov 6, 2025)
- `CHECK`: location max 500 characters if provided (added Nov 6, 2025)
- `CHECK`: description max 2000 characters if provided (added Nov 6, 2025)

**Total Constraints**: 6

**Indexes:**
- `events_pkey`: PRIMARY KEY on id (UNIQUE, BTREE)
- `idx_events_organization_id`: On organization_id (for filtering by organization)
- `idx_events_created_by`: On created_by (for filtering by creator)
- `idx_events_date`: On date DESC (for chronological sorting)
- `idx_events_created_at`: On created_at DESC (for recent events)
- `idx_events_name`: On event_name (for search functionality)
- `idx_events_org_date`: Composite on (organization_id, date DESC) (optimized for org event lists)
- `idx_events_name_lower`: On LOWER(event_name) (case-insensitive search, added Nov 6, 2025)

**Total Indexes**: 8

**Triggers:**
- `update_events_updated_at`: Auto-updates `updated_at` column on row modification
  - Timing: BEFORE UPDATE
  - Orientation: ROW
  - Action: EXECUTE FUNCTION update_updated_at_column()

---

### Foreign Key Relationships

**Events belongs to:**
1. **Organizations** (organization_id → organizations.id)
   - Update Rule: NO ACTION
   - Delete Rule: CASCADE (deleting an organization deletes all its events)

2. **Users** (created_by → users.id)
   - Update Rule: NO ACTION
   - Delete Rule: CASCADE (deleting a user deletes events they created)

**Events is referenced by:**
- **Attendance Records** (future feature - events will be referenced by attendance tracking)

---

## Row Level Security (RLS) Policies

### RLS Status
- **Enabled**: ✅ TRUE
- **Total Policies**: 5 policies (Updated Nov 6, 2025)

---

### Events Table Policies

#### 1. **SELECT Policies** (2 policies)

##### `Members can view organization events`
- **Operation**: SELECT
- **Roles**: authenticated
- **Type**: PERMISSIVE
- **Logic**: Users can view events from organizations they are members of
- **Using Expression**:
  ```sql
  EXISTS (
    SELECT 1
    FROM organization_members om
    WHERE om.organization_id = events.organization_id
      AND om.user_id = auth.uid()
  )
  ```

##### `members_can_view_events`
- **Operation**: SELECT
- **Roles**: public
- **Type**: PERMISSIVE
- **Logic**: Function-based policy using helper function
- **Using Expression**: `is_org_member(organization_id, auth.uid())`

---

#### 2. **INSERT Policies** (1 policy)

##### `Admins and Attendance Takers can create events`
- **Operation**: INSERT
- **Roles**: authenticated
- **Type**: PERMISSIVE
- **Logic**: Only users with Owner, Admin, or Attendance Taker roles can create events
- **With Check Expression**:
  ```sql
  EXISTS (
    SELECT 1
    FROM organization_members om
    WHERE om.organization_id = events.organization_id
      AND om.user_id = auth.uid()
      AND om.role IN ('Owner', 'Admin', 'Attendance Taker')
  )
  ```

**Note**: Previously conflicting policy `members_can_create_events` has been removed (Nov 6, 2025).

---

#### 3. **UPDATE Policy** (1 policy)

##### `creators_and_admins_can_update_events`
- **Operation**: UPDATE
- **Roles**: authenticated
- **Type**: PERMISSIVE
- **Logic**: Event creators OR organization Owners/Admins can update events
- **Using Expression**:
  ```sql
  (created_by = auth.uid()) OR EXISTS (
    SELECT 1
    FROM organization_members om
    WHERE om.organization_id = events.organization_id
      AND om.user_id = auth.uid()
      AND om.role IN ('Owner', 'Admin')
  )
  ```
- **With Check Expression**: Same as using expression

---

#### 4. **DELETE Policy** (1 policy)

##### `creators_and_admins_can_delete_events`
- **Operation**: DELETE
- **Roles**: authenticated
- **Type**: PERMISSIVE
- **Logic**: Event creators OR organization Owners/Admins can delete events
- **Using Expression**:
  ```sql
  (created_by = auth.uid()) OR EXISTS (
    SELECT 1
    FROM organization_members om
    WHERE om.organization_id = events.organization_id
      AND om.user_id = auth.uid()
      AND om.role IN ('Owner', 'Admin')
  )
  ```

---

## Database Functions

### Event-Related Functions

The following helper functions are available for event management:

```sql
-- Check if user is organization member
is_org_member(org_id uuid, user_auth_id uuid) → boolean
  -- Returns true if user is a member of the organization
  -- Used in event viewing policies

-- Check if user can create events in organization
can_create_event_in_org(p_organization_id uuid, p_user_id uuid DEFAULT auth.uid()) → boolean
  -- Returns true if user has Owner, Admin, or Attendance Taker role
  -- SECURITY DEFINER, STABLE
  -- Added: Nov 6, 2025

-- Check if user can edit/delete specific event
can_manage_event(p_event_id uuid, p_user_id uuid DEFAULT auth.uid()) → boolean
  -- Returns true if user is event creator OR organization Owner/Admin
  -- SECURITY DEFINER, STABLE
  -- Added: Nov 6, 2025

-- Get event count for organization
get_organization_event_count(p_organization_id uuid) → integer
  -- Returns total number of events for an organization
  -- SECURITY DEFINER, STABLE
  -- Added: Nov 6, 2025

-- Get upcoming events count for organization
get_upcoming_events_count(p_organization_id uuid) → integer
  -- Returns count of future events for an organization
  -- SECURITY DEFINER, STABLE
  -- Added: Nov 6, 2025

-- Get user's created events count
get_user_events_count(p_user_id uuid) → integer
  -- Returns total number of events created by a user
  -- SECURITY DEFINER, STABLE
  -- Added: Nov 6, 2025
```

**Function Details:**

#### `can_create_event_in_org()`
Checks if a user has permission to create events in an organization by verifying they have an elevated role.

```sql
CREATE OR REPLACE FUNCTION can_create_event_in_org(
    p_organization_id uuid,
    p_user_id uuid DEFAULT auth.uid()
)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM organization_members
        WHERE organization_id = p_organization_id
            AND user_id = p_user_id
            AND role IN ('Owner', 'Admin', 'Attendance Taker')
    );
$$;
```

#### `can_manage_event()`
Checks if a user can edit or delete an event. Returns true if:
- User is the event creator, OR
- User is Owner/Admin of the organization

```sql
CREATE OR REPLACE FUNCTION can_manage_event(
    p_event_id uuid,
    p_user_id uuid DEFAULT auth.uid()
)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM events e
        WHERE e.id = p_event_id
            AND e.created_by = p_user_id
    ) OR EXISTS (
        SELECT 1
        FROM events e
        JOIN organization_members om ON om.organization_id = e.organization_id
        WHERE e.id = p_event_id
            AND om.user_id = p_user_id
            AND om.role IN ('Owner', 'Admin')
    );
$$;
```

---

## Database Views

### Event Views

Three views have been created for common event queries:

#### 1. `events_with_details`
Complete event information with organization and creator details.

```sql
CREATE OR REPLACE VIEW events_with_details AS
SELECT 
    e.id,
    e.event_name,
    e.date,
    e.organization_id,
    e.description,
    e.location,
    e.created_by,
    e.created_at,
    e.updated_at,
    -- Organization details
    o.name as organization_name,
    o.tag as organization_tag,
    o.description as organization_description,
    -- Creator details
    u.name as creator_name,
    u.email as creator_email,
    u.user_type as creator_user_type
FROM events e
JOIN organizations o ON o.id = e.organization_id
JOIN users u ON u.id = e.created_by;
```

**Use Case**: Fetch complete event details with related data in a single query.

#### 2. `upcoming_events`
Events scheduled in the future.

```sql
CREATE OR REPLACE VIEW upcoming_events AS
SELECT 
    e.*,
    o.name as organization_name,
    o.tag as organization_tag
FROM events e
JOIN organizations o ON o.id = e.organization_id
WHERE e.date > now()
ORDER BY e.date ASC;
```

**Use Case**: Quick access to future events without date filtering in queries.

#### 3. `past_events`
Events that have already occurred.

```sql
CREATE OR REPLACE VIEW past_events AS
SELECT 
    e.*,
    o.name as organization_name,
    o.tag as organization_tag
FROM events e
JOIN organizations o ON o.id = e.organization_id
WHERE e.date <= now()
ORDER BY e.date DESC;
```

**Use Case**: Historical event data, attendance reports, analytics.

**Note**: All views have RLS enabled via `security_invoker = on`.

---

## API Endpoints

### Event Management

#### `POST /api/event`
Create a new event (Owner/Admin/Attendance Taker only).

**Request Body:**
```typescript
{
  event_name: string           // Required
  date: string                 // Required, ISO 8601 format with timezone
  organization_id: string      // Required, UUID
  description?: string         // Optional
  location?: string            // Optional
}
```

**Response:**
```typescript
{
  event: Event
}
```

**Errors:**
- `400`: Missing required fields or invalid data
- `401`: Unauthorized (not authenticated)
- `403`: Forbidden (insufficient permissions - not Owner/Admin/Attendance Taker)
- `404`: Organization not found
- `500`: Server error

**Validation:**
- event_name: Required, non-empty string
- date: Required, valid ISO 8601 timestamp with timezone
- organization_id: Required, valid UUID, organization must exist
- User must be a member of the organization with appropriate role
- created_by automatically set to authenticated user

---

#### `GET /api/event`
Get events with optional filters.

**Query Parameters:**
- `organization_id`: Filter by specific organization (UUID)
- `created_by`: Filter by event creator (UUID)
- `from_date`: Filter events from this date onward (ISO 8601)
- `to_date`: Filter events up to this date (ISO 8601)
- `page`: Page number for pagination (default: 1)
- `limit`: Results per page (default: 10, max: 50)
- `sort`: Sort field (date, event_name, created_at)
- `order`: Sort order (asc, desc)

**Response:**
```typescript
{
  events: Array<Event & {
    organization: {
      id: string
      name: string
      tag: string | null
    }
    creator: {
      id: string
      name: string
      email: string
    }
  }>
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}
```

**Authorization:**
- Users can only see events from organizations they are members of
- Filtered automatically by RLS policies

---

#### `GET /api/event/[id]`
Get event details by ID.

**Response:**
```typescript
{
  event: Event & {
    organization: {
      id: string
      name: string
      tag: string | null
      description: string | null
    }
    creator: {
      id: string
      name: string
      email: string
      user_type: UserType
    }
    attendance_count?: number  // If attendance feature implemented
  }
}
```

**Errors:**
- `401`: Unauthorized
- `403`: Forbidden (not a member of the organization)
- `404`: Event not found

---

#### `PUT /api/event/[id]`
Update event details (Creator/Owner/Admin only).

**Request Body:**
```typescript
{
  event_name?: string
  date?: string              // ISO 8601 format with timezone
  description?: string       // null to remove
  location?: string          // null to remove
}
```

**Response:**
```typescript
{
  event: Event
}
```

**Errors:**
- `400`: Invalid input data
- `401`: Unauthorized
- `403`: Forbidden (not creator/owner/admin)
- `404`: Event not found
- `500`: Server error

**Authorization:**
- Only event creator OR organization Owner/Admin can update
- Enforced by RLS policy

---

#### `DELETE /api/event/[id]`
Delete an event (Creator/Owner/Admin only).

**Response:**
```typescript
{
  message: "Event deleted successfully"
}
```

**Errors:**
- `401`: Unauthorized
- `403`: Forbidden (not creator/owner/admin)
- `404`: Event not found
- `500`: Server error

**Authorization:**
- Only event creator OR organization Owner/Admin can delete
- Enforced by RLS policy
- Cascade deletes related attendance records (future feature)

---

#### `GET /api/event/organization/[organizationId]`
Get all events for a specific organization.

**Query Parameters:**
- `upcoming`: Boolean, filter for upcoming events only
- `past`: Boolean, filter for past events only
- `page`: Page number (default: 1)
- `limit`: Results per page (default: 20)

**Response:**
```typescript
{
  events: Array<Event & {
    creator: {
      id: string
      name: string
    }
    attendance_summary?: {
      total_members: number
      attended: number
      attendance_rate: number
    }
  }>
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}
```

**Authorization:**
- User must be a member of the organization
- Enforced by RLS policies

---

## Frontend Components

### Event Views (To Be Implemented)

#### `EventListView`
**Location:** `src/components/events/event-list-view.tsx` (pending)

List view showing organization's events.

**Expected Features:**
- Event cards with name, date, location
- Filter by upcoming/past events
- Sort by date/name
- Pagination controls
- Quick actions (View/Edit/Delete)
- Create event button (for authorized users)

---

#### `EventDetailView`
**Location:** `src/components/events/event-detail-view.tsx` (pending)

Detailed view of a specific event.

**Expected Features:**
- Event information display
- Location and description
- Creator information
- Edit/Delete buttons (for authorized users)
- Attendance list (future feature)
- QR code for attendance (future feature)
- Export attendance data (future feature)

---

#### `CreateEventForm`
**Location:** `src/components/events/create-event-form.tsx` (pending)

Form for creating new events.

**Expected Features:**
- Event name input (required)
- Date/time picker with timezone (required)
- Organization selector (required)
- Location input (optional)
- Description textarea (optional)
- Validation and error handling
- Success redirect to event detail

---

#### `EditEventForm`
**Location:** `src/components/events/edit-event-form.tsx` (pending)

Form for editing existing events.

**Expected Features:**
- Pre-populated form with current data
- Same fields as create form
- Update validation
- Cancel and save actions
- Permission checks

---

#### `EventCalendarView`
**Location:** `src/components/events/event-calendar-view.tsx` (pending)

Calendar view of organization events.

**Expected Features:**
- Month/week/day views
- Event markers on calendar
- Click to view event details
- Color coding by organization
- Quick create event on date

---

## Types & Interfaces

### Event Types
**Location:** `src/types/event.ts`

```typescript
// Base event interface
export interface Event {
  id: string
  event_name: string
  date: string                    // ISO 8601 timestamp with timezone
  organization_id: string
  description: string | null
  location: string | null
  created_by: string
  created_at: string
  updated_at: string
}

// Event with organization details
export interface EventWithOrganization extends Event {
  organization: {
    id: string
    name: string
    tag: string | null
    description: string | null
  }
}

// Event with creator details
export interface EventWithCreator extends Event {
  creator: {
    id: string
    name: string
    email: string
    user_type: UserType
  }
}

// Event with full details (organization + creator)
export interface EventWithDetails extends Event {
  organization: {
    id: string
    name: string
    tag: string | null
    description: string | null
  }
  creator: {
    id: string
    name: string
    email: string
    user_type: UserType
  }
  attendance_count?: number       // Future feature
  attendance_rate?: number         // Future feature
}

// Create event input
export interface CreateEventInput {
  event_name: string
  date: string                    // ISO 8601 format
  organization_id: string
  description?: string
  location?: string
}

// Update event input
export interface UpdateEventInput {
  event_name?: string
  date?: string                   // ISO 8601 format
  description?: string | null
  location?: string | null
}

// Event filters
export interface EventFilters {
  organization_id?: string
  created_by?: string
  from_date?: string
  to_date?: string
  upcoming?: boolean
  past?: boolean
}

// Event query options
export interface EventQueryOptions extends EventFilters {
  page?: number
  limit?: number
  sort?: 'date' | 'event_name' | 'created_at'
  order?: 'asc' | 'desc'
}
```

---

## Features

### 1. Event Creation
- Organization members with appropriate roles can create events
- Required information: name, date/time, organization
- Optional information: description, location
- Creator automatically recorded
- Timestamps auto-generated

### 2. Event Management
- View event details
- Edit event information (creator/owner/admin only)
- Delete events (creator/owner/admin only)
- List events by organization
- Filter upcoming/past events

### 3. Event Viewing
- Members can view organization events
- Event list with sorting and filtering
- Calendar view (future enhancement)
- Event search functionality (future enhancement)

### 4. Permission-Based Access
- **View Events**: All organization members
- **Create Events**: Owner, Admin, Attendance Taker
- **Edit Events**: Event creator, Owner, Admin
- **Delete Events**: Event creator, Owner, Admin

### 5. Date & Time Management
- Timezone-aware timestamps
- Sort by date (ascending/descending)
- Filter by date range
- Upcoming vs past event filtering

### 6. Organization Integration
- Events tied to specific organizations
- Only organization members can view events
- Cascade delete when organization deleted
- Organization context in event display

### 7. Future Features (Planned)
- **Attendance Tracking**: NFC/QR code check-in
- **Attendance Reports**: Export attendance data
- **Event Notifications**: Remind members of upcoming events
- **Recurring Events**: Create repeating events
- **Event Categories**: Tag events by type
- **RSVP System**: Allow members to RSVP
- **Event Capacity**: Set maximum attendees

---

## Security & Permissions

### Permission Matrix

| Action | Owner | Admin | Attendance Taker | Member | Non-Member |
|--------|-------|-------|------------------|--------|------------|
| View Events | ✅ | ✅ | ✅ | ✅ | ❌ |
| Create Events | ✅ | ✅ | ✅ | ❌ | ❌ |
| Edit Own Events | ✅ | ✅ | ✅ | ❌* | ❌ |
| Edit Any Events | ✅ | ✅ | ❌ | ❌ | ❌ |
| Delete Own Events | ✅ | ✅ | ✅ | ❌* | ❌ |
| Delete Any Events | ✅ | ✅ | ❌ | ❌ | ❌ |

*Note: Regular Members cannot create events. Only Owner/Admin/Attendance Taker roles can create events. Policy conflict resolved Nov 6, 2025.

---

### Security Features

1. **Row Level Security (RLS)**
   - Enabled on events table
   - 6 policies enforcing access control
   - Automatic filtering by membership

2. **Role-Based Permissions**
   - Policies check organization membership and roles
   - Cascade permissions (Owner > Admin > Attendance Taker)
   - Creator-based permissions for edit/delete

3. **Data Protection**
   - Users can only see events from their organizations
   - Cannot access events from organizations they don't belong to
   - Automatic filtering at database level

4. **Input Validation**
   - Required fields enforced at database level
   - Date/time validation with timezone support
   - Foreign key constraints ensure data integrity

5. **Audit Trail**
   - created_by tracks event creator
   - created_at records creation timestamp
   - updated_at auto-updates on modifications
   - Immutable audit fields

---

## Database Grants & Permissions

### Role Permissions

| Role | Privileges |
|------|-----------|
| `postgres` | ALL (DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE) with GRANT option |
| `authenticated` | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| `anon` | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| `service_role` | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |

**Note**: RLS policies restrict actual access despite these grants.

---

## Current Status

### Implementation Status
- ✅ Database table created
- ✅ RLS policies configured (5 policies, no conflicts)
- ✅ Indexes optimized (8 indexes)
- ✅ Foreign key relationships established
- ✅ Triggers configured
- ✅ Helper functions created (5 functions)
- ✅ Views created (3 views)
- ✅ Check constraints added (3 constraints)
- ⚠️ API endpoints (partial - needs review)
- ❌ Frontend components (pending)
- ❌ Attendance tracking integration (future)

### Database Summary (Updated Nov 6, 2025)
- **Policies**: 5 (2 SELECT, 1 INSERT, 1 UPDATE, 1 DELETE)
- **Indexes**: 8 (including case-insensitive name search)
- **Constraints**: 6 (including data validation)
- **Functions**: 5 (permission checks and counts)
- **Views**: 3 (events_with_details, upcoming_events, past_events)

### Current Data
- **Rows**: 0 (no events created yet)
- **Inserts**: 0
- **Updates**: 0
- **Deletes**: 0

### Known Issues / TODO

1. ~~**Policy Conflict**: Resolve overlapping INSERT policies~~ ✅ **RESOLVED** (Nov 6, 2025)
   - ~~`Admins and Attendance Takers can create events` (restrictive)~~
   - ~~`members_can_create_events` (permissive)~~
   - **Action**: ✅ Removed permissive policy, kept restrictive policy

2. **API Implementation**: Review and complete event API endpoints
   - Implement filtering and pagination
   - Add event search functionality
   - Implement organization event list endpoint

3. **Frontend**: Create event management components
   - Event list view
   - Event detail view
   - Create/edit event forms
   - Calendar view

4. **Integration**: Connect with attendance feature (future)
   - Design attendance table schema
   - Implement check-in functionality
   - Create attendance reports

---

## Best Practices

1. **Always validate organization membership** before creating events
2. **Use timezone-aware timestamps** for accurate scheduling
3. **Check permissions** on edit/delete operations
4. **Provide clear error messages** for validation failures
5. **Index properly** for performance (already done)
6. **Cascade deletes carefully** to maintain data integrity
7. **Audit trail** - maintain created_by for accountability

---

## Integration Points

### With Organization Feature
- Events belong to organizations
- Permission based on organization roles
- Organization context required for event creation
- Cascade delete when organization deleted

### With User Feature
- Events created by users (created_by)
- Creator information displayed
- User permissions determine event actions

### With Membership Feature
- Event permissions based on membership roles
- Only members can view organization events
- Role hierarchy determines create/edit/delete access

### With Attendance Feature (Future)
- Events as basis for attendance tracking
- NFC/QR check-in linked to events
- Attendance reports per event
- Attendance rate calculations

---

**End of Event Documentation**
