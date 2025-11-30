-- ============================================================================
-- EVENT FILES MIGRATION
-- File Upload System for Events
-- ============================================================================
-- Purpose: Add support for uploading documents and images to events with
--          attendee-only visibility and automatic cleanup 3 days after event
-- Date: November 30, 2025
-- ============================================================================

-- ----------------------------------------------------------------------------
-- TABLE: event_files
-- Stores metadata for files attached to events
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS event_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL CHECK (length(file_name) > 0 AND length(file_name) <= 255),
    file_url TEXT NOT NULL,
    storage_path TEXT NOT NULL CHECK (length(storage_path) > 0),
    file_type TEXT NOT NULL CHECK (file_type IN ('document', 'image')),
    file_size_bytes BIGINT NOT NULL CHECK (file_size_bytes > 0 AND file_size_bytes <= 20971520), -- 20MB max
    mime_type TEXT NOT NULL,
    uploaded_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    CONSTRAINT valid_mime_types CHECK (
        mime_type IN (
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'image/jpeg',
            'image/png'
        )
    )
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_event_files_event_id ON event_files(event_id);
CREATE INDEX IF NOT EXISTS idx_event_files_uploaded_at ON event_files(uploaded_at DESC);
CREATE INDEX IF NOT EXISTS idx_event_files_uploaded_by ON event_files(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_event_files_file_type ON event_files(file_type);

COMMENT ON TABLE event_files IS 'Stores metadata for documents and images attached to events';
COMMENT ON COLUMN event_files.storage_path IS 'Full path in Supabase Storage bucket for reliable cleanup';
COMMENT ON COLUMN event_files.file_size_bytes IS 'File size in bytes, max 20MB (20971520 bytes)';

-- ----------------------------------------------------------------------------
-- ADD FEATURED IMAGE COLUMNS TO EVENTS TABLE
-- Stores the featured image (event poster) for display
-- ----------------------------------------------------------------------------

ALTER TABLE events
    ADD COLUMN IF NOT EXISTS featured_image_url TEXT,
    ADD COLUMN IF NOT EXISTS featured_image_storage_path TEXT;

COMMENT ON COLUMN events.featured_image_url IS 'URL to the featured image (event poster) displayed prominently on event pages';
COMMENT ON COLUMN events.featured_image_storage_path IS 'Storage path for featured image cleanup';

-- ----------------------------------------------------------------------------
-- RLS POLICIES FOR event_files TABLE
-- Restrict access based on event attendance
-- ----------------------------------------------------------------------------

-- Enable RLS
ALTER TABLE event_files ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view files for events they have attended
CREATE POLICY event_files_select_attended_events ON event_files
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM event_attendance
            WHERE event_attendance.event_id = event_files.event_id
              AND event_attendance.user_id = auth.uid()
        )
    );

-- Policy: Admins and attendance takers can upload files to their organization's events
CREATE POLICY event_files_insert_org_permissions ON event_files
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM events e
            INNER JOIN organization_members om ON om.organization_id = e.organization_id
            WHERE e.id = event_files.event_id
              AND om.user_id = auth.uid()
              AND om.role IN ('Owner', 'Admin', 'Attendance Taker')
        )
    );

-- Policy: File uploaders, event creators, org admins/owners can delete files
CREATE POLICY event_files_delete_permissions ON event_files
    FOR DELETE
    TO authenticated
    USING (
        -- User uploaded the file
        uploaded_by = auth.uid()
        OR
        -- User created the event
        EXISTS (
            SELECT 1 FROM events
            WHERE events.id = event_files.event_id
              AND events.created_by = auth.uid()
        )
        OR
        -- User is org admin/owner
        EXISTS (
            SELECT 1 FROM events e
            INNER JOIN organization_members om ON om.organization_id = e.organization_id
            WHERE e.id = event_files.event_id
              AND om.user_id = auth.uid()
              AND om.role IN ('Owner', 'Admin')
        )
    );

COMMENT ON POLICY event_files_select_attended_events ON event_files IS 'Users can only view files for events they attended';
COMMENT ON POLICY event_files_insert_org_permissions ON event_files IS 'Only org admins/attendance takers can upload files';
COMMENT ON POLICY event_files_delete_permissions ON event_files IS 'Uploaders, event creators, and org admins can delete files';

-- ----------------------------------------------------------------------------
-- FUNCTION: cleanup_expired_event_files
-- Purpose: Delete files from events that ended more than 3 days ago
-- Returns: Count of files deleted
-- Note: Designed to be called by admin API endpoint with external cron
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION cleanup_expired_event_files()
RETURNS JSON AS $$
DECLARE
    v_deleted_count INTEGER := 0;
    v_file_record RECORD;
    v_storage_paths TEXT[] := ARRAY[]::TEXT[];
BEGIN
    -- Find and delete expired event files
    -- Files are eligible for deletion 3 days after the event date
    FOR v_file_record IN
        SELECT ef.id, ef.storage_path, ef.file_name, e.event_name, e.date
        FROM event_files ef
        INNER JOIN events e ON e.id = ef.event_id
        WHERE e.date + INTERVAL '3 days' < NOW()
    LOOP
        -- Collect storage path for reference
        v_storage_paths := array_append(v_storage_paths, v_file_record.storage_path);
        
        -- Delete from database (triggers cascade)
        DELETE FROM event_files WHERE id = v_file_record.id;
        
        v_deleted_count := v_deleted_count + 1;
    END LOOP;
    
    -- Also cleanup orphaned featured images from expired events
    UPDATE events
    SET featured_image_url = NULL,
        featured_image_storage_path = NULL
    WHERE date + INTERVAL '3 days' < NOW()
      AND featured_image_url IS NOT NULL;
    
    RETURN json_build_object(
        'success', TRUE,
        'files_deleted', v_deleted_count,
        'storage_paths', v_storage_paths,
        'message', format('Deleted %s expired event files', v_deleted_count)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION cleanup_expired_event_files IS 'Removes files from events that ended more than 3 days ago. Call via admin API endpoint.';

-- ----------------------------------------------------------------------------
-- FUNCTION: get_event_file_count
-- Purpose: Get the count of files attached to a specific event
-- Parameters: p_event_id - The event UUID
-- Returns: Count of files
-- Note: Useful for enforcing 10-file limit in application
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION get_event_file_count(p_event_id UUID)
RETURNS INTEGER AS $$
DECLARE
    v_count INTEGER;
BEGIN
    SELECT COUNT(*)::INTEGER INTO v_count
    FROM event_files
    WHERE event_id = p_event_id;
    
    RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_event_file_count IS 'Returns the number of files attached to an event';

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION cleanup_expired_event_files() TO authenticated;
GRANT EXECUTE ON FUNCTION get_event_file_count(UUID) TO authenticated;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- Next steps:
-- 1. Create 'event-files' bucket in Supabase Dashboard Storage
-- 2. Configure bucket with:
--    - Public: false (use RLS)
--    - File size limit: 20MB
--    - Allowed MIME types: application/pdf, application/msword, 
--      application/vnd.openxmlformats-officedocument.wordprocessingml.document,
--      image/jpeg, image/png
-- 3. Set up RLS policies on Storage bucket matching table policies
-- 4. Configure external cron job to call /api/admin/cleanup-files endpoint
-- ============================================================================
