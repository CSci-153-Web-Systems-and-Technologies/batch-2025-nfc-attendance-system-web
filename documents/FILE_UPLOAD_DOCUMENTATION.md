# Event File Upload System - Technical Documentation

## Overview

The Event File Upload System allows organization admins and attendance takers to attach documents and images to events. Files are only visible to users who have attended the event, providing a secure way to share event materials, presentations, and photos.

## Architecture

### Components

1. **Database Layer** (`event_files` table)
   - Stores file metadata (name, URL, size, type, uploader)
   - RLS policies restrict access to attendees only
   - Foreign keys ensure data integrity with events and users

2. **Storage Layer** (Supabase Storage `event-files` bucket)
   - Stores actual file binaries
   - Separate RLS policies mirror database access control
   - Path structure: `{org_id}/{event_id}/{timestamp}-{filename}`

3. **API Layer**
   - `POST /api/event` - Create event with files
   - `PUT /api/event/[id]` - Update event and featured image
   - `GET /api/event/[id]/files` - Retrieve event files
   - `POST /api/event/[id]/files` - Add files to existing event
   - `DELETE /api/event/[id]/files` - Remove files from event
   - `POST /api/admin/cleanup-files` - Clean up expired files

4. **UI Layer**
   - `create-event-form.tsx` - Upload files during creation
   - `edit-event-form.tsx` - Manage files during editing
   - `[eventId]/page.tsx` - Display files to attendees

---

## Data Flow

### File Upload Flow (Create Event)

```
User fills form → Selects files → Client validates
  ↓
Creates FormData with event JSON + files
  ↓
POST /api/event with multipart/form-data
  ↓
Server validates (count, size, type)
  ↓
Creates event in database
  ↓
Uploads featured image to Storage (if provided)
  ↓
Updates event.featured_image_url
  ↓
Uploads additional files to Storage
  ↓
Inserts metadata into event_files table
  ↓
Returns created event with upload results
```

### File Upload Flow (Edit Event)

```
User opens edit form → Fetches existing files
  ↓
User adds/removes files → Marks files for deletion
  ↓
Client validates new files
  ↓
Deletes marked files via DELETE /api/event/[id]/files
  ↓
Updates event via PUT /api/event/[id] (with featured image if changed)
  ↓
Uploads new files via POST /api/event/[id]/files
  ↓
Returns to event detail page
```

### File Access Flow (View Event)

```
User views event → Server checks if user attended
  ↓
If attended: Fetch files from event_files
  ↓
RLS policy validates attendance
  ↓
Returns files with metadata
  ↓
UI displays files with download buttons
```

---

## File Validation

### Client-Side Validation
```typescript
// File count
if (files.length + existingFiles.length > 10) {
  error: "Max 10 files"
}

// File size
if (file.size > 20 * 1024 * 1024) {
  error: "Max 20MB per file"
}

// File type
const ALLOWED = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg',
  'image/png'
]
if (!ALLOWED.includes(file.type)) {
  error: "Invalid file type"
}
```

### Server-Side Validation
```typescript
// Same validations as client
// Additional: Supabase Storage enforces size limits
// Database CHECK constraints validate MIME types
```

### Database Validation
```sql
-- File name length
CHECK (length(file_name) > 0 AND length(file_name) <= 255)

-- File size
CHECK (file_size_bytes > 0 AND file_size_bytes <= 20971520)

-- File type enum
CHECK (file_type IN ('document', 'image'))

-- MIME type whitelist
CHECK (mime_type IN (...))
```

---

## Access Control

### Database RLS Policies

#### SELECT Policy (Attendees Only)
```sql
CREATE POLICY event_files_select_attended_events ON event_files
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM event_attendance
    WHERE event_attendance.event_id = event_files.event_id
      AND event_attendance.user_id = auth.uid()
  )
);
```

#### INSERT Policy (Org Admins/Attendance Takers)
```sql
CREATE POLICY event_files_insert_org_permissions ON event_files
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM events e
    INNER JOIN organization_members om ON om.organization_id = e.organization_id
    WHERE e.id = event_files.event_id
      AND om.user_id = auth.uid()
      AND om.role IN ('Owner', 'Admin', 'Attendance Taker')
  )
);
```

#### DELETE Policy (Uploaders, Creators, Admins)
```sql
CREATE POLICY event_files_delete_permissions ON event_files
FOR DELETE TO authenticated
USING (
  uploaded_by = auth.uid()
  OR EXISTS (SELECT 1 FROM events WHERE id = event_files.event_id AND created_by = auth.uid())
  OR EXISTS (
    SELECT 1 FROM events e
    INNER JOIN organization_members om ON om.organization_id = e.organization_id
    WHERE e.id = event_files.event_id
      AND om.user_id = auth.uid()
      AND om.role IN ('Owner', 'Admin')
  )
);
```

### Storage RLS Policies

Similar policies applied to `storage.objects` table for the `event-files` bucket.

---

## File Cleanup System

### Automatic Cleanup Logic

Files are eligible for deletion **3 days** after the event date:

```sql
SELECT ef.*
FROM event_files ef
INNER JOIN events e ON e.id = ef.event_id
WHERE e.date + INTERVAL '3 days' < NOW()
```

### Cleanup Function

```sql
CREATE OR REPLACE FUNCTION cleanup_expired_event_files()
RETURNS JSON AS $$
DECLARE
  v_deleted_count INTEGER := 0;
  v_storage_paths TEXT[] := ARRAY[]::TEXT[];
BEGIN
  -- Delete from event_files table
  FOR v_file_record IN (SELECT eligible files) LOOP
    v_storage_paths := array_append(v_storage_paths, v_file_record.storage_path);
    DELETE FROM event_files WHERE id = v_file_record.id;
    v_deleted_count := v_deleted_count + 1;
  END LOOP;
  
  -- Also cleanup featured images
  UPDATE events SET featured_image_url = NULL
  WHERE date + INTERVAL '3 days' < NOW();
  
  RETURN json_build_object(...);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Manual Cleanup Endpoint

```typescript
// POST /api/admin/cleanup-files
// 1. Verify user is org admin/owner
// 2. Call cleanup_expired_event_files() function
// 3. Delete files from Storage using returned paths
// 4. Return cleanup report
```

---

## Storage Path Structure

Files are stored with a hierarchical path structure:

```
event-files/
  ├── {organization_id}/
  │   ├── {event_id}/
  │   │   ├── {timestamp}-{sanitized_filename}.pdf
  │   │   ├── {timestamp}-{sanitized_filename}.jpg
  │   │   └── featured/
  │   │       └── {timestamp}-{sanitized_filename}.png
  │   └── {another_event_id}/
  │       └── ...
  └── {another_organization_id}/
      └── ...
```

**Benefits:**
- Easy to locate files by organization and event
- Featured images separated in subfolder
- Timestamp prevents filename collisions
- Sanitized filenames prevent path injection

---

## Error Handling

### Client-Side Errors

Per-file validation errors displayed inline:
```typescript
const fileErrors: { fileName: string; error: string }[] = []

// Displayed in UI:
<div className="bg-destructive/10">
  <strong>{error.fileName}:</strong> {error.error}
</div>
```

### Server-Side Errors

Partial success responses:
```typescript
return NextResponse.json({
  uploadedFiles: [file1, file2],  // Successful uploads
  uploadErrors: [                  // Failed uploads
    { fileName: 'doc.pdf', error: 'Storage error' }
  ],
  validationErrors: [              // Invalid files
    { fileName: 'huge.jpg', error: 'Size exceeds 20MB' }
  ]
})
```

### Database Errors

Foreign key constraints ensure:
- `event_id` must exist in `events` table
- `uploaded_by` must exist in `users` table
- Cascade delete when event or user is deleted

---

## Performance Considerations

### File Upload Optimization
- Client validates before upload (reduces server load)
- Individual file upload (not all-or-nothing batch)
- Partial success handling (some files can fail)

### File Retrieval
- Indexed queries on `event_id` (fast lookup)
- Ordered by `uploaded_at DESC` (latest first)
- Lazy loading (files fetched only when viewing event)

### Storage Cleanup
- Batch deletion via array of storage paths
- Background job execution (doesn't block users)
- Manual trigger for admins (on-demand cleanup)

---

## Security Best Practices

### File Upload Security
✅ **Implemented:**
- MIME type validation (client + server + database)
- File size limits (Supabase + application)
- Sanitized filenames (remove special characters)
- RLS policies (attendee-only access)
- Role-based upload permissions

⚠️ **Future Enhancements:**
- Magic byte validation (verify actual file content)
- Virus scanning integration
- Content Security Policy headers

### Storage Security
✅ **Implemented:**
- Private bucket (not publicly accessible)
- RLS policies on storage.objects
- Service role for admin operations only

### Access Control
✅ **Implemented:**
- Attendance-based file access
- Role-based upload/delete permissions
- User authentication required for all operations

---

## Testing

### Unit Testing Recommendations

```typescript
// File validation
test('rejects files over 20MB', () => { ... })
test('rejects invalid MIME types', () => { ... })
test('enforces 10 file limit', () => { ... })

// Upload flow
test('uploads files to Storage', async () => { ... })
test('inserts metadata into database', async () => { ... })
test('handles partial upload failures', async () => { ... })

// Access control
test('attendees can view files', async () => { ... })
test('non-attendees cannot view files', async () => { ... })
test('admins can upload files', async () => { ... })

// Cleanup
test('deletes files 3 days after event', async () => { ... })
test('preserves files within grace period', async () => { ... })
```

### Integration Testing

1. **Upload Flow:** Create event → Upload files → Verify in Storage and DB
2. **Access Control:** Attend event → View files → Verify RLS enforcement
3. **Edit Flow:** Edit event → Add/remove files → Verify persistence
4. **Cleanup:** Mock event date → Run cleanup → Verify deletion

---

## Monitoring & Logging

### Key Metrics to Track
- File upload success rate
- File upload failures (by error type)
- Storage usage per organization
- Cleanup job execution frequency
- Average file size per event

### Logging Points
```typescript
console.log('File upload started', { eventId, fileCount })
console.error('File upload failed', { fileName, error })
console.log('Cleanup executed', { filesDeleted, storageFreed })
```

---

## Common Issues & Solutions

### Issue: Files not visible to attendees
**Cause:** User hasn't attended the event yet
**Solution:** Verify `event_attendance` record exists

### Issue: Upload fails with 413 error
**Cause:** File exceeds 20MB limit
**Solution:** Client validation should catch this; check Supabase limits

### Issue: Cleanup deletes files too early
**Cause:** Event date incorrectly set or grace period misconfigured
**Solution:** Verify event.date is accurate; check INTERVAL in SQL

### Issue: Featured image not displaying
**Cause:** featured_image_url is NULL or invalid
**Solution:** Verify upload succeeded; check Storage URL accessibility

---

## Related Documentation

- [Setup Guide](./FILE_UPLOAD_SETUP.md) - Supabase configuration steps
- [Event Documentation](./EVENT_DOCUMENTATION.md) - Event system overview
- [Tag System](./TAG_SYSTEM_EXPLANATION.md) - Tag management details

---

**Last Updated:** November 30, 2025
**Version:** 1.0.0
**Status:** Production Ready (pending Supabase setup)
