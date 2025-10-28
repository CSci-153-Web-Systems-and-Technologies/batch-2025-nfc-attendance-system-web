# Events Backend - Quick Setup Guide

## 🎯 Overview

This feature adds event management capabilities to the NFC Attendance System. Events are activities hosted by organizations that can be used for attendance tracking.

## 📋 What's Included

- **Database Schema**: Complete SQL setup with RLS policies
- **Service Layer**: Business logic for event operations
- **API Routes**: RESTful endpoints for event management
- **TypeScript Types**: Full type definitions
- **Documentation**: API reference and feature summary

## 🚀 Quick Setup

### 1. Database Setup

Run the SQL from `EVENTS_BACKEND_SETUP.md` in your Supabase SQL editor:

```sql
-- Create events table (see EVENTS_BACKEND_SETUP.md for full SQL)
CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_name TEXT NOT NULL,
  date TIMESTAMPTZ NOT NULL,
  organization_id UUID NOT NULL,
  description TEXT,
  location TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT fk_organization
    FOREIGN KEY (organization_id)
    REFERENCES organizations(id)
    ON DELETE CASCADE,
  
  CONSTRAINT fk_created_by_user
    FOREIGN KEY (created_by)
    REFERENCES users(id)
    ON DELETE CASCADE
);

-- Don't forget to:
-- 1. Create indexes
-- 2. Enable RLS
-- 3. Set up policies
-- 4. Add triggers
-- (All included in EVENTS_BACKEND_SETUP.md)
```

### 2. Verify Setup

The backend code is already in place. Just verify:

- ✅ Types defined in `src/types/event.ts`
- ✅ Service layer in `src/lib/services/event.service.ts`
- ✅ API routes in `src/app/api/event/`

### 3. Test API

Test the endpoints using curl or your favorite API client:

```bash
# Get all events
curl http://localhost:3000/api/event

# Create an event
curl -X POST http://localhost:3000/api/event \
  -H "Content-Type: application/json" \
  -d '{
    "event_name": "Team Meeting",
    "date": "2025-11-15T14:00:00.000Z",
    "organization_id": "your-org-id",
    "description": "Monthly sync",
    "location": "Room 101"
  }'
```

## 📚 Documentation

- **[EVENTS_BACKEND_SETUP.md](./EVENTS_BACKEND_SETUP.md)** - Complete database setup instructions
- **[EVENTS_API_REFERENCE.md](./EVENTS_API_REFERENCE.md)** - Detailed API documentation
- **[EVENTS_FEATURE_SUMMARY.md](./EVENTS_FEATURE_SUMMARY.md)** - Feature overview and architecture

## 🔑 Key Features

### Event Management
- Create, read, update, delete events
- Search and filter capabilities
- Date range queries
- Organization-specific event lists

### Permissions
- All members can **view** events
- Owner, Admin, Attendance Taker can **create/update** events
- Owner, Admin can **delete** events

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/event` | List all user events |
| POST | `/api/event` | Create new event |
| GET | `/api/event/[id]` | Get event details |
| PUT | `/api/event/[id]` | Update event |
| DELETE | `/api/event/[id]` | Delete event |
| GET | `/api/organization/[id]/events` | List organization events |

## 🎨 Frontend Integration (Next Steps)

To integrate with the frontend:

1. **Create Event Components**
   - Event list view
   - Event creation form
   - Event detail page
   - Event edit form

2. **Add Navigation**
   - Link to events from organization pages
   - Dashboard widgets for upcoming events

3. **Implement Features**
   - Calendar view
   - Event search
   - Filters (date range, organization)

## 🧪 Testing

### Manual Testing Checklist

- [ ] Create an event with all fields
- [ ] Create an event with only required fields
- [ ] View event list
- [ ] Filter events by organization
- [ ] Filter events by date range
- [ ] Search events
- [ ] Get upcoming events
- [ ] Get past events
- [ ] Update an event
- [ ] Delete an event
- [ ] Test permission checks (different roles)

### Test Different Roles

- [ ] Owner: Can create, update, delete
- [ ] Admin: Can create, update, delete
- [ ] Attendance Taker: Can create, update (not delete)
- [ ] Member: Can only view

## 🔄 Commit History

This feature was built with clean commit history for easy rollback:

1. `feat: add event types and interfaces`
2. `feat: add events database schema and setup documentation`
3. `feat: implement event service layer with CRUD operations`
4. `feat: implement event API routes (GET, POST, PUT, DELETE)`
5. `docs: add comprehensive events documentation`

Each commit is atomic and can be reverted independently if needed.

## ⚠️ Prerequisites

Before using this feature, ensure you have:

- ✅ Supabase project set up
- ✅ Organizations feature implemented
- ✅ Users table and authentication
- ✅ Next.js 14+ with App Router
- ✅ TypeScript configured

## 🐛 Troubleshooting

### Events not showing up?
- Check user is a member of the organization
- Verify RLS policies are enabled
- Check database foreign key constraints

### Permission errors?
- Verify user role in organization
- Check organization membership
- Review RLS policy definitions

### Date issues?
- Always use ISO 8601 format
- Include timezone information
- Verify date is valid timestamp

## 🚦 Next Steps

After setting up the events backend:

1. **Frontend Development**
   - Build UI components
   - Create event pages
   - Integrate with API

2. **Attendance Integration** (Future)
   - Link events to attendance records
   - NFC/QR code check-in
   - Attendance reports

3. **Enhanced Features** (Future)
   - Recurring events
   - Event notifications
   - Capacity limits
   - Event templates

## 💡 Tips

- Use TypeScript types for type safety
- Handle errors gracefully in API calls
- Always validate user permissions
- Test with different user roles
- Use date filters for better performance

## 📞 Support

For questions or issues:
- Review the documentation files
- Check the API reference for endpoint details
- Verify database setup is complete
- Test with different user roles

---

**Status**: ✅ Backend Complete

Created: October 28, 2025
