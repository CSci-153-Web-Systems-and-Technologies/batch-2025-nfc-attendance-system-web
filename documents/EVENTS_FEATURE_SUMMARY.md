# Events Feature Summary - NFC Attendance System

## Overview

The Events feature allows organizations to create and manage activities/events. Events are the foundation for tracking attendance within the NFC Attendance System.

## Key Features

### 1. Event Management
- ✅ Create events for organizations
- ✅ View event details
- ✅ Update event information
- ✅ Delete events
- ✅ Search and filter events

### 2. Role-Based Permissions
- **View Events**: All organization members
- **Create/Update Events**: Owner, Admin, Attendance Taker
- **Delete Events**: Owner, Admin only

### 3. Event Properties
- **Required**: Event name, date, organization
- **Optional**: Description, location
- **Automatic**: Creator tracking, timestamps

### 4. Advanced Querying
- Filter by organization
- Filter by date range
- Search by name, description, or location
- Get upcoming events
- Get past events

## Architecture

### Database Layer
- **Table**: `events`
- **Foreign Keys**: 
  - `organization_id` → `organizations`
  - `created_by` → `users`
- **Row-Level Security**: Enabled with role-based policies
- **Indexes**: Optimized for common queries

### Service Layer
- **File**: `src/lib/services/event.service.ts`
- **Methods**: 
  - `createEvent()`
  - `getEventById()`
  - `getEventWithDetails()`
  - `getUserEvents()`
  - `getOrganizationEvents()`
  - `updateEvent()`
  - `deleteEvent()`
  - `getUpcomingEvents()`
  - `getPastEvents()`

### API Layer
- **Main Route**: `/api/event`
  - `GET` - List all user events
  - `POST` - Create new event
- **Single Event Route**: `/api/event/[id]`
  - `GET` - Get event details
  - `PUT` - Update event
  - `DELETE` - Delete event
- **Organization Route**: `/api/organization/[id]/events`
  - `GET` - List organization events

### Type Definitions
- **File**: `src/types/event.ts`
- **Types**:
  - `Event` - Base event interface
  - `EventWithOrganization` - Event with org details
  - `EventWithDetails` - Event with full details
  - `CreateEventInput` - Creation payload
  - `UpdateEventInput` - Update payload
  - `EventFilters` - Query filters

## File Structure

```
src/
├── types/
│   └── event.ts                              # Event type definitions
├── lib/
│   └── services/
│       └── event.service.ts                  # Event business logic
└── app/
    └── api/
        ├── event/
        │   ├── route.ts                      # List & create events
        │   └── [id]/
        │       └── route.ts                  # Get, update, delete event
        └── organization/
            └── [id]/
                └── events/
                    └── route.ts              # Organization events

documents/
├── EVENTS_BACKEND_SETUP.md                   # Database schema & setup
├── EVENTS_API_REFERENCE.md                   # API documentation
└── EVENTS_FEATURE_SUMMARY.md                 # This file
```

## Database Schema

```sql
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_name TEXT NOT NULL,
  date TIMESTAMPTZ NOT NULL,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  description TEXT,
  location TEXT,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

## API Endpoints Summary

| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| GET | `/api/event` | List user events | Member+ |
| POST | `/api/event` | Create event | Attendance Taker+ |
| GET | `/api/event/[id]` | Get event details | Member+ |
| PUT | `/api/event/[id]` | Update event | Attendance Taker+ |
| DELETE | `/api/event/[id]` | Delete event | Admin+ |
| GET | `/api/organization/[id]/events` | List org events | Member+ |

## Usage Examples

### Create an Event

```typescript
const response = await fetch('/api/event', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    event_name: 'Tech Talk: AI in Web Development',
    date: '2025-11-15T14:00:00.000Z',
    organization_id: 'org-uuid',
    description: 'Learn about the latest AI tools for developers',
    location: 'Room 101'
  })
})

const event = await response.json()
```

### Get Upcoming Events

```typescript
const response = await fetch('/api/event?upcoming=true&limit=10')
const events = await response.json()
```

### Search Events

```typescript
const response = await fetch('/api/event?search=meeting&from_date=2025-11-01')
const events = await response.json()
```

### Update an Event

```typescript
const response = await fetch(`/api/event/${eventId}`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    location: 'Room 202 (Changed)',
    date: '2025-11-15T15:00:00.000Z'
  })
})

const updatedEvent = await response.json()
```

### Delete an Event

```typescript
const response = await fetch(`/api/event/${eventId}`, {
  method: 'DELETE'
})

const result = await response.json() // { success: true, message: "..." }
```

## Security Features

### Row-Level Security (RLS)
- Users can only view events from organizations they belong to
- Create/update/delete operations check user roles
- All queries are scoped to user's accessible organizations

### Permission Checks
- Service layer validates permissions before operations
- API layer authenticates user and fetches profile
- Database policies enforce access control

### Data Validation
- Required fields validated
- Date format validated
- Organization membership verified
- User role authorization checked

## Performance Optimizations

### Database Indexes
- `idx_events_organization_id` - Organization lookups
- `idx_events_date` - Date filtering
- `idx_events_created_by` - Creator filtering
- `idx_events_org_date` - Composite for common queries
- `idx_events_name` - Name searches

### Query Optimizations
- Batch fetching of organization memberships
- Selective field retrieval
- Proper use of foreign key relationships
- Efficient date range queries

## Future Enhancements

### Phase 2 - Attendance Tracking
- Link events to attendance records
- Track who attended each event
- NFC/QR code check-in functionality
- Attendance reports and analytics

### Phase 3 - Event Features
- Recurring events
- Event reminders/notifications
- Event capacity limits
- Event registration
- Event templates

### Phase 4 - Analytics
- Attendance statistics per event
- Popular event times
- Event participation trends
- Organization activity metrics

## Testing Checklist

### API Endpoints
- [x] GET all events
- [x] GET upcoming events
- [x] GET past events
- [x] GET events with filters
- [x] GET organization events
- [x] GET single event
- [x] GET event with details
- [x] POST create event
- [x] PUT update event
- [x] DELETE event

### Permissions
- [ ] Member can view events
- [ ] Member cannot create events
- [ ] Attendance Taker can create events
- [ ] Attendance Taker can update events
- [ ] Attendance Taker cannot delete events
- [ ] Admin can create/update/delete events
- [ ] Owner can create/update/delete events
- [ ] Non-member cannot access organization events

### Edge Cases
- [ ] Invalid date format
- [ ] Missing required fields
- [ ] Non-existent organization
- [ ] Non-existent event
- [ ] Unauthorized user
- [ ] Date range queries
- [ ] Search functionality
- [ ] Empty result sets

## Dependencies

### Required
- Supabase (Database & Auth)
- Next.js 14+ (App Router)
- TypeScript

### Related Features
- Organization Management
- User Management
- Authentication System

## Migration Path

### From Scratch
1. Run SQL from `EVENTS_BACKEND_SETUP.md`
2. Verify tables and policies created
3. Test API endpoints
4. Implement frontend components

### Adding to Existing System
1. Ensure organizations and users tables exist
2. Run events table SQL
3. Set up RLS policies
4. Deploy API routes
5. Test integration with existing features

## Known Limitations

1. **No Recurring Events**: Each event is a one-time occurrence
2. **No Attendance Tracking Yet**: Will be added in future phase
3. **No Event Capacity**: No limit on attendees per event
4. **No Notifications**: No automatic reminders or notifications
5. **Basic Search**: Full-text search not implemented

## Support & Documentation

- **Database Setup**: See `EVENTS_BACKEND_SETUP.md`
- **API Reference**: See `EVENTS_API_REFERENCE.md`
- **Organization Setup**: See `ORGANIZATION_BACKEND_SETUP.md`
- **User Setup**: See `USER_BACKEND_SETUP.md`

## Changelog

### v1.0.0 (October 28, 2025)
- Initial implementation
- CRUD operations for events
- Role-based permissions
- Advanced filtering and search
- Comprehensive documentation

---

**Status**: ✅ Backend Complete | 🔄 Frontend Pending | ⏳ Attendance Integration Pending

Last updated: October 28, 2025
