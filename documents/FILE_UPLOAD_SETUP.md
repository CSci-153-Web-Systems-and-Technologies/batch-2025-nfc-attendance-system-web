# Event File Upload System - Setup Guide

## Implementation Complete ✅

The event file upload system has been fully implemented with the following features:
- Featured image upload for events (event posters, 16:9 recommended)
- Additional file uploads (PDF, Word, Images) - max 10 files per event
- Attendee-only file access (owners/admins can always view)
- File management in create/edit forms
- Automatic cleanup 3 days after event ends
- Admin cleanup API endpoint

---

## Required Supabase Setup Steps

### 1. Run Database Migration

Execute the migration file in your Supabase SQL Editor:

**File:** `supabase/migrations/20251130000000_event_files.sql`

**What it does:**
- Creates `event_files` table with metadata columns
- Adds `featured_image_url` and `featured_image_storage_path` columns to `events` table
- Sets up RLS policies for attendee + admin/owner access
- Creates `cleanup_expired_event_files()` function
- Creates `get_event_file_count()` helper function

**To run:**
1. Go to Supabase Dashboard → SQL Editor
2. Copy the entire migration file content
3. Paste and run the SQL

**Note:** If you've already run an older version of the migration, run this to fix the SELECT policy:
```sql
-- Drop the old restrictive policy
DROP POLICY IF EXISTS event_files_select_attended_events ON event_files;
DROP POLICY IF EXISTS event_files_select_policy ON event_files;

-- Create new policy that allows attendees AND org owners/admins (case-insensitive)
CREATE POLICY event_files_select_policy ON event_files
    FOR SELECT
    TO authenticated
    USING (
        -- User attended the event
        EXISTS (
            SELECT 1 FROM event_attendance
            WHERE event_attendance.event_id = event_files.event_id
              AND event_attendance.user_id = auth.uid()
        )
        OR
        -- User is org owner or admin (case-insensitive for role matching)
        EXISTS (
            SELECT 1 FROM events e
            INNER JOIN organization_members om ON om.organization_id = e.organization_id
            WHERE e.id = event_files.event_id
              AND om.user_id = auth.uid()
              AND LOWER(om.role) IN ('owner', 'admin')
        )
    );
```

---

### 2. Create Supabase Storage Bucket

**Bucket Name:** `event-files`

**Steps:**
1. Go to Supabase Dashboard → Storage
2. Click "New bucket"
3. Set name: `event-files`
4. **Public bucket:** `true` (simplifies URL access; RLS on database controls visibility)
5. **File size limit:** `20971520` bytes (20MB)
6. Click "Create bucket"

**Allowed MIME Types:**
Configure the bucket to accept these MIME types:
- `image/png, image/jpeg, application/pdf, application/msword, application/vnd.openxmlformats-officedocument.wordprocessingml.document`

---

### 3. Configure Storage Policies

Since the bucket is public, files can be accessed via URL. The security is enforced at the database level:
- `event_files` table has RLS policies that restrict which file records users can see
- Only attendees OR org owners/admins can query file metadata
- Regular members who haven't attended won't see file URLs in the UI

For additional storage-level security (optional), add these policies in Supabase → Storage → Policies:
    EXISTS (
      SELECT 1
      FROM events e
      INNER JOIN organization_members om ON om.organization_id = e.organization_id
      WHERE e.id::text = split_part(name, '/', 2)
        AND om.user_id = auth.uid()
        AND om.role IN ('Owner', 'Admin', 'Attendance Taker')
    )
  )
);
```

#### Policy 3: DELETE - File Uploaders, Event Creators, Org Admins
```sql
-- Allow file deletion by uploader, event creator, or org admins
CREATE POLICY "event_files_storage_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'event-files'
  AND (
    -- Check if user uploaded the file or is event creator or org admin
    EXISTS (
      SELECT 1
      FROM event_files ef
      INNER JOIN events e ON e.id = ef.event_id
      LEFT JOIN organization_members om ON om.organization_id = e.organization_id AND om.user_id = auth.uid()
      WHERE ef.storage_path = name
        AND (
          ef.uploaded_by = auth.uid()
          OR e.created_by = auth.uid()
          OR om.role IN ('Owner', 'Admin')
        )
    )
  )
);
```

---

### 5. Set Up Automated Cleanup (Optional)

The system includes a cleanup function that deletes files 3 days after events end. You have two options:

#### Option A: Manual Cleanup via API (Recommended for Prototype)
Organization owners/admins can call the cleanup endpoint manually:

**Endpoint:** `POST /api/admin/cleanup-files`
**Access:** Organization owners/admins only
**Preview:** `GET /api/admin/cleanup-files` (shows eligible files without deleting)

#### Option B: Automated Cleanup with External Cron
Set up a scheduled job using:
- **Vercel Cron** (if hosted on Vercel)
- **GitHub Actions** (scheduled workflow)
- **External service** (cron-job.org, EasyCron, etc.)

**Scheduled task:**
```bash
curl -X POST https://your-domain.com/api/admin/cleanup-files \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```


**Recommended frequency:** Daily

---

## Testing the Implementation

### 1. Test File Upload During Event Creation
1. Navigate to an organization you're an admin/owner of
2. Click "Create Event"
3. Fill in event details
4. Upload a featured image (JPG/PNG)
5. Add additional files (PDF, Word, Images)
6. Create the event
7. Verify files appear in the event detail page

### 2. Test File Visibility (Attendee-Only)
1. Create an event with files as admin
2. Log in as a different user (non-attendee)
3. View the event detail page
4. Verify files are NOT visible
5. Mark that user's attendance
6. Refresh the page
7. Verify files NOW appear

### 3. Test File Management in Edit Mode
1. Edit an existing event with files
2. Add new files
3. Delete existing files
4. Update the event
5. Verify changes persist

### 4. Test File Cleanup (Manual)
1. As an organization owner/admin, call:
   ```
   GET /api/admin/cleanup-files
   ```
2. Verify it returns list of eligible files
3. Call:
   ```
   POST /api/admin/cleanup-files
   ```
4. Verify cleanup report is returned

---

## File Upload Limits & Validation

### Client-Side Validation
- **File count:** Max 10 files per event
- **File size:** Max 20MB per file
- **File types:**
  - Documents: `.pdf`, `.doc`, `.docx`
  - Images: `.jpg`, `.jpeg`, `.png`
- **Featured image:** Only images (JPG/PNG), recommended 1200x675px (16:9)

### Server-Side Validation
- Supabase enforces file size limits (20MB)
- MIME type validation via bucket configuration
- File count validation via database function
- RLS policies enforce access control

### Database Constraints
- File names: max 255 characters
- File size: max 20MB (enforced in CHECK constraint)
- MIME type whitelist in CHECK constraint

---

## API Endpoints

### File Management
- `GET /api/event/[id]/files` - Get files for an event (attendees only)
- `POST /api/event/[id]/files` - Add files to event (admins/attendance takers)
- `DELETE /api/event/[id]/files` - Delete files (uploaders/creators/admins)

### Admin Cleanup
- `GET /api/admin/cleanup-files` - Preview eligible files for cleanup
- `POST /api/admin/cleanup-files` - Execute cleanup and delete expired files

---

## Database Schema

### `event_files` Table
```sql
- id: UUID (PK)
- event_id: UUID (FK to events)
- file_name: TEXT (max 255 chars)
- file_url: TEXT
- storage_path: TEXT (for cleanup)
- file_type: TEXT ('document' | 'image')
- file_size_bytes: BIGINT (max 20MB)
- mime_type: TEXT (whitelist enforced)
- uploaded_by: UUID (FK to users)
- uploaded_at: TIMESTAMPTZ
```

### `events` Table (New Columns)
```sql
- featured_image_url: TEXT (nullable)
- featured_image_storage_path: TEXT (nullable)
```

---

## Security Features

### Row-Level Security (RLS)
- Files visible only to event attendees
- Upload restricted to org admins/attendance takers
- Deletion restricted to uploaders/creators/org admins

### Storage RLS
- Separate RLS policies on Storage bucket
- Aligned with table-level policies
- Service role used for cleanup bypass

### Validation
- File type whitelist (server + client)
- File size limits (Supabase + application)
- File count limits (max 10)
- MIME type validation in database

---

## Troubleshooting

### Files Not Visible to Attendees
1. Verify user has `event_attendance` record for the event
2. Check RLS policies are enabled on `event_files` table
3. Verify Storage bucket RLS policies are set up

### Upload Fails
1. Check file size (must be ≤20MB)
2. Verify file type is allowed
3. Ensure user has admin/attendance taker role
4. Check Storage bucket exists and is configured

### Cleanup Not Working
1. Verify user is organization owner/admin
2. Check database function `cleanup_expired_event_files()` exists
3. Ensure service role client is configured in server
4. Verify Storage bucket permissions for deletion

### Featured Image Not Displaying
1. Check `featured_image_url` column has a value
2. Verify image is accessible (not deleted)
3. Ensure image URL is valid and publicly readable via RLS

---

## Future Enhancements

As noted in the README, future improvements include:
- **Magic byte validation** - Enhanced security by checking file headers
- **Organization storage quotas** - Limit total storage per organization
- **Concurrent edit conflict resolution** - Handle multiple admins editing simultaneously
- **File version history** - Track file changes over time
- **Bulk file operations** - Upload/delete multiple files at once

---

## Support

For issues or questions:
1. Check this setup guide
2. Review the database migration file
3. Verify Supabase Storage configuration
4. Check browser console for errors
5. Review server logs for API errors

---

**Setup Status:** ⏳ Pending Supabase Configuration
**After completing steps 1-4, the file upload system will be fully functional!**
