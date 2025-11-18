# Attendance System Documentation

## Overview

The Attendance System provides comprehensive event attendance tracking with support for multiple scan methods (NFC, QR Code, Manual). It includes real-time updates, geolocation tracking, and detailed reporting capabilities.

**Status:** ✅ Active  
**Last Updated:** November 19, 2025  
**Version:** 1.0.0

---

## Table of Contents

1. [Database Schema](#database-schema)
2. [API Endpoints](#api-endpoints)
3. [Service Methods](#service-methods)
4. [RLS Policies](#rls-policies)
5. [Database Functions](#database-functions)
6. [Real-time Updates](#real-time-updates)
7. [Usage Examples](#usage-examples)

---

## Database Schema

### Table: `event_attendance`

Stores attendance records for organization events.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | NO | gen_random_uuid() | Primary key |
| `event_id` | UUID | NO | - | FK to events.id |
| `user_id` | UUID | NO | - | FK to users.id (attendee) |
| `marked_at` | TIMESTAMP WITH TIME ZONE | NO | NOW() | When attendance was marked |
| `marked_by` | UUID | NO | - | FK to users.id (attendance taker) |
| `scan_method` | TEXT | NO | - | 'NFC', 'QR', or 'Manual' |
| `location_lat` | DECIMAL(10, 8) | YES | NULL | Latitude where marked |
| `location_lng` | DECIMAL(11, 8) | YES | NULL | Longitude where marked |
| `notes` | TEXT | YES | NULL | Optional notes (max 1000 chars) |
| `created_at` | TIMESTAMP WITH TIME ZONE | NO | NOW() | Record creation time |
| `updated_at` | TIMESTAMP WITH TIME ZONE | NO | NOW() | Last update time |

**Constraints:**
- `unique_event_user`: UNIQUE(event_id, user_id) - One attendance per user per event
- `valid_scan_method`: CHECK scan_method IN ('NFC', 'QR', 'Manual')
- `valid_latitude`: CHECK location_lat BETWEEN -90 AND 90
- `valid_longitude`: CHECK location_lng BETWEEN -180 AND 180
- `notes_length`: CHECK length(notes) <= 1000

**Indexes:**
- `idx_attendance_event_id` ON (event_id)
- `idx_attendance_user_id` ON (user_id)
- `idx_attendance_marked_at` ON (marked_at DESC)
- `idx_attendance_marked_by` ON (marked_by)
- `idx_attendance_event_marked_at` ON (event_id, marked_at DESC)
- `idx_attendance_scan_method` ON (scan_method)

**Foreign Keys:**
- `event_id` → `events.id` ON DELETE CASCADE
- `user_id` → `users.id` ON DELETE CASCADE
- `marked_by` → `users.id` ON DELETE CASCADE

---

## API Endpoints

### POST `/api/attendance`

Mark a user's attendance at an event.

**Authentication:** Required (Attendance Taker, Admin, or Owner role)

**Request Body:**
```typescript
{
  event_id: string;        // UUID
  user_id: string;         // UUID
  scan_method: 'NFC' | 'QR' | 'Manual';
  location_lat?: number;   // Optional
  location_lng?: number;   // Optional
  notes?: string;          // Optional (max 1000 chars)
}
```

**Response:**
```typescript
{
  success: true,
  attendance_id: string,
  marked_at: string
}
```

**Errors:**
- `400` - Invalid input
- `401` - Unauthorized
- `403` - Insufficient permissions
- `409` - Attendance already marked
- `404` - Event or user not found

---

### GET `/api/attendance/event/[id]`

Get all attendance records for an event.

**Authentication:** Required (Organization member)

**Query Parameters:**
- `details`: boolean (default: false) - Include full user/event details

**Response:**
```typescript
{
  event_id: string;
  total_attended: number;
  total_members: number;
  attendance_rate: number;
  attendees: AttendanceWithUser[];
}
```

---

### DELETE `/api/attendance/[id]`

Delete an attendance record (for corrections).

**Authentication:** Required (Admin or Owner role)

**Response:**
```typescript
{
  success: true,
  message: 'Attendance record deleted'
}
```

---

## Service Methods

### AttendanceService

Location: `src/lib/services/attendance.service.ts`

#### `markAttendance(markedBy: string, input: MarkAttendanceInput): Promise<MarkAttendanceResponse>`

Mark a user's attendance at an event.

**Parameters:**
- `markedBy`: UUID of user marking attendance
- `input`: MarkAttendanceInput object

**Returns:** MarkAttendanceResponse

**Throws:**
- Error if user already attended
- Error if user not in organization
- Error if marker lacks permission

---

#### `getEventAttendance(eventId: string): Promise<EventAttendanceList>`

Get all attendance records for an event.

**Parameters:**
- `eventId`: UUID of the event

**Returns:** EventAttendanceList with summary and attendee details

---

#### `getEventAttendanceSummary(eventId: string): Promise<EventAttendanceSummary>`

Get attendance statistics for an event.

**Parameters:**
- `eventId`: UUID of the event

**Returns:** EventAttendanceSummary with counts and percentages

---

#### `getUserAttendanceHistory(userId: string, orgId?: string): Promise<Attendance[]>`

Get a user's attendance history, optionally filtered by organization.

**Parameters:**
- `userId`: UUID of the user
- `orgId`: Optional organization UUID

**Returns:** Array of Attendance records

---

#### `isUserAttended(eventId: string, userId: string): Promise<boolean>`

Check if a user has attended an event.

**Parameters:**
- `eventId`: UUID of the event
- `userId`: UUID of the user

**Returns:** Boolean indicating attendance status

---

#### `deleteAttendance(attendanceId: string, userId: string): Promise<void>`

Delete an attendance record (requires Admin/Owner permission).

**Parameters:**
- `attendanceId`: UUID of attendance record
- `userId`: UUID of user requesting deletion

**Throws:** Error if user lacks permission

---

## RLS Policies

### `members_can_view_org_event_attendance`

**Operation:** SELECT  
**Rule:** Users can view attendance for events in organizations they are members of

```sql
USING (
    EXISTS (
        SELECT 1
        FROM events e
        WHERE e.id = event_id
        AND is_org_member(e.organization_id, auth.uid())
    )
)
```

---

### `attendance_takers_can_create_attendance`

**Operation:** INSERT  
**Rule:** Attendance Takers, Admins, and Owners can mark attendance

```sql
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM events e
        WHERE e.id = event_id
        AND user_has_permission(auth.uid(), e.organization_id, 'Attendance Taker')
    )
    AND marked_by = auth.uid()
)
```

---

### `admins_can_delete_attendance`

**Operation:** DELETE  
**Rule:** Admins and Owners can delete attendance records

```sql
USING (
    EXISTS (
        SELECT 1
        FROM events e
        WHERE e.id = event_id
        AND user_has_permission(auth.uid(), e.organization_id, 'Admin')
    )
)
```

---

### `admins_can_update_attendance`

**Operation:** UPDATE  
**Rule:** Admins and Owners can update attendance records

```sql
USING (
    EXISTS (
        SELECT 1
        FROM events e
        WHERE e.id = event_id
        AND user_has_permission(auth.uid(), e.organization_id, 'Admin')
    )
)
```

---

## Database Functions

### `mark_attendance(...)`

Mark a user's attendance with comprehensive validation.

**Signature:**
```sql
mark_attendance(
    p_event_id UUID,
    p_user_id UUID,
    p_marked_by UUID,
    p_scan_method TEXT,
    p_location_lat DECIMAL DEFAULT NULL,
    p_location_lng DECIMAL DEFAULT NULL,
    p_notes TEXT DEFAULT NULL
) RETURNS JSON
```

**Validations:**
- Prevents duplicate attendance
- Verifies event exists
- Verifies user is organization member
- Verifies marker has Attendance Taker permission or higher

**Returns:**
```json
{
  "success": true,
  "attendance_id": "uuid",
  "marked_at": "timestamp"
}
```

---

### `get_event_attendance_count(p_event_id UUID)`

Returns the total number of attendees for an event.

**Returns:** INTEGER

---

### `get_event_member_count(p_event_id UUID)`

Returns the total number of members in the event's organization.

**Returns:** INTEGER

---

### `is_user_attended(p_event_id UUID, p_user_id UUID)`

Check if a user has attended a specific event.

**Returns:** BOOLEAN

---

### `can_take_attendance(p_event_id UUID, p_user_id UUID)`

Check if a user has permission to take attendance for an event.

**Returns:** BOOLEAN

---

## Database Views

### `attendance_with_details`

Complete attendance records with user, event, and organization details.

**Columns:**
- All `event_attendance` columns
- `user_name`, `user_email`, `user_type` (attendee)
- `event_name`, `event_date`, `event_location`
- `organization_id`, `organization_name`
- `marked_by_name`, `marked_by_email` (attendance taker)

**Usage:**
```sql
SELECT * FROM attendance_with_details
WHERE event_id = 'uuid'
ORDER BY marked_at DESC;
```

---

### `event_attendance_summary`

Summary statistics for each event's attendance.

**Columns:**
- `event_id`, `event_name`, `event_date`
- `organization_id`, `organization_name`
- `total_attended`, `total_members`
- `attendance_percentage`
- `nfc_scans`, `qr_scans`, `manual_entries`
- `last_attendance_marked`

**Usage:**
```sql
SELECT * FROM event_attendance_summary
WHERE organization_id = 'uuid'
ORDER BY event_date DESC;
```

---

### `user_attendance_stats`

Attendance statistics per user per organization.

**Columns:**
- `user_id`, `user_name`, `user_email`
- `organization_id`, `organization_name`
- `total_events`, `events_attended`, `events_missed`
- `attendance_rate` (percentage)

**Usage:**
```sql
SELECT * FROM user_attendance_stats
WHERE user_id = 'uuid' AND organization_id = 'uuid';
```

---

## Real-time Updates

The attendance system supports real-time updates using Supabase Realtime.

### Subscribe to Event Attendance

```typescript
import { createClient } from '@/lib/client';

const supabase = createClient();

const channel = supabase
  .channel(`event-attendance-${eventId}`)
  .on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'event_attendance',
      filter: `event_id=eq.${eventId}`
    },
    (payload) => {
      console.log('New attendance:', payload.new);
      // Update UI with new attendance
    }
  )
  .subscribe();

// Cleanup
return () => {
  channel.unsubscribe();
};
```

---

## Usage Examples

### Mark Attendance via NFC Scan

```typescript
import { AttendanceService } from '@/lib/services/attendance.service';

const result = await AttendanceService.markAttendance(markerUserId, {
  event_id: eventId,
  user_id: attendeeUserId,
  scan_method: 'NFC',
  location_lat: 14.5995,
  location_lng: 120.9842
});

console.log('Attendance marked:', result.attendance_id);
```

---

### Get Event Attendance List

```typescript
import { AttendanceService } from '@/lib/services/attendance.service';

const attendanceList = await AttendanceService.getEventAttendance(eventId);

console.log(`${attendanceList.total_attended} of ${attendanceList.total_members} attended`);
console.log(`Attendance rate: ${attendanceList.attendance_rate}%`);
```

---

### Check if User Attended

```typescript
import { AttendanceService } from '@/lib/services/attendance.service';

const hasAttended = await AttendanceService.isUserAttended(eventId, userId);

if (hasAttended) {
  console.log('User already marked present');
}
```

---

## Scan Method Breakdown

### NFC (Near Field Communication)
- **Platform:** Android Chrome only
- **Range:** ~4-10cm
- **Speed:** Instant tap
- **Use Case:** Quick check-in with NFC tags

### QR (QR Code)
- **Platform:** All modern browsers with camera
- **Range:** Camera view (10-50cm)
- **Speed:** 1-2 seconds
- **Use Case:** Backup method, iOS devices

### Manual
- **Platform:** All browsers
- **Range:** N/A
- **Speed:** Depends on search
- **Use Case:** Fallback for technical issues

---

## Security Considerations

1. **Duplicate Prevention:** Unique constraint on (event_id, user_id)
2. **Organization Membership:** Users must be org members to be marked
3. **Permission Checks:** Only Attendance Takers+ can mark attendance
4. **Immutable Audit Trail:** Attendance records track who marked, when, and how
5. **Geolocation Tracking:** Optional location verification
6. **RLS Policies:** Row-level security enforces access control

---

## Performance Optimization

- **Indexes:** Optimized for event-based queries
- **Views:** Pre-joined data for common queries
- **Realtime:** Efficient subscriptions with filters
- **Caching:** Consider caching attendance summaries

---

## Future Enhancements

- [ ] Attendance time windows (only mark during event)
- [ ] Geofencing validation
- [ ] Batch attendance marking
- [ ] Export to CSV/Excel
- [ ] Attendance reports and analytics
- [ ] Email notifications
- [ ] Late arrival tracking
- [ ] Early departure tracking

---

## Related Documentation

- [Tag Management Documentation](./TAG_MANAGEMENT_DOCUMENTATION.md)
- [Event Documentation](./EVENT_DOCUMENTATION.md)
- [User Documentation](./USER_DOCUMENTATION.md)
- [Organization Documentation](./ORGANIZATION_DOCUMENTATION.md)

---

**Last Updated:** November 19, 2025  
**Maintained By:** Development Team
