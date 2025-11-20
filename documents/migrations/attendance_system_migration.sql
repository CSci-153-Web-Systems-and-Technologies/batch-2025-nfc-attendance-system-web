-- ============================================================================
-- ATTENDANCE SYSTEM MIGRATION
-- ============================================================================
-- Date: November 19, 2025
-- Description: Adds attendance tracking, tag management, and NFC/QR functionality
-- Author: System Migration
-- Version: 1.0.0
-- ============================================================================
--
-- This migration adds:
-- 1. Unified tag_id column to users table (replaces nfc_tag_id and qr_code_data)
-- 2. user_tag_writes table for tracking tag generation history
-- 3. event_attendance table for recording attendance
-- 4. Helper functions for tag management and attendance tracking
-- 5. Database views for attendance reports
-- 6. RLS policies for secure access
-- 7. Indexes for performance optimization
--
-- IMPORTANT: Run this migration in a transaction and test thoroughly
-- ============================================================================

BEGIN;

-- ============================================================================
-- STEP 1: UPDATE USERS TABLE - ADD TAG_ID COLUMN
-- ============================================================================

-- Add new tag_id column (will replace nfc_tag_id and qr_code_data)
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS tag_id TEXT UNIQUE;

-- Create index for fast tag lookups
CREATE INDEX IF NOT EXISTS idx_users_tag_id ON users(tag_id);

-- Migrate existing nfc_tag_id values to tag_id (if any exist)
UPDATE users SET tag_id = nfc_tag_id WHERE nfc_tag_id IS NOT NULL AND tag_id IS NULL;

-- Migrate existing qr_code_data values to tag_id (if tag_id is still null)
UPDATE users SET tag_id = qr_code_data WHERE qr_code_data IS NOT NULL AND tag_id IS NULL;

-- Note: We'll keep nfc_tag_id and qr_code_data columns temporarily for backward compatibility
-- They can be dropped in a future migration after verification

COMMENT ON COLUMN users.tag_id IS 'Unified identifier for both NFC tags and QR codes. Generated on first write.';

-- ============================================================================
-- STEP 2: CREATE USER_TAG_WRITES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_tag_writes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tag_id TEXT NOT NULL,
    written_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    -- Ensure we record the tag value that was written
    CONSTRAINT tag_id_not_empty CHECK (length(tag_id) > 0)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_tag_writes_user_id ON user_tag_writes(user_id);
CREATE INDEX IF NOT EXISTS idx_tag_writes_written_at ON user_tag_writes(written_at DESC);
CREATE INDEX IF NOT EXISTS idx_tag_writes_user_written ON user_tag_writes(user_id, written_at DESC);

COMMENT ON TABLE user_tag_writes IS 'Tracks history of tag writes to enforce cooldown period and prevent abuse';
COMMENT ON COLUMN user_tag_writes.written_at IS 'Timestamp when the tag was written/generated';

-- ============================================================================
-- STEP 3: CREATE EVENT_ATTENDANCE TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS event_attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    marked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    marked_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    scan_method TEXT NOT NULL,
    location_lat DECIMAL(10, 8),
    location_lng DECIMAL(11, 8),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT unique_event_user UNIQUE(event_id, user_id),
    CONSTRAINT valid_scan_method CHECK (scan_method IN ('NFC', 'QR', 'Manual')),
    CONSTRAINT valid_latitude CHECK (location_lat IS NULL OR (location_lat >= -90 AND location_lat <= 90)),
    CONSTRAINT valid_longitude CHECK (location_lng IS NULL OR (location_lng >= -180 AND location_lng <= 180)),
    CONSTRAINT notes_length CHECK (notes IS NULL OR length(notes) <= 1000)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_attendance_event_id ON event_attendance(event_id);
CREATE INDEX IF NOT EXISTS idx_attendance_user_id ON event_attendance(user_id);
CREATE INDEX IF NOT EXISTS idx_attendance_marked_at ON event_attendance(marked_at DESC);
CREATE INDEX IF NOT EXISTS idx_attendance_marked_by ON event_attendance(marked_by);
CREATE INDEX IF NOT EXISTS idx_attendance_event_marked_at ON event_attendance(event_id, marked_at DESC);
CREATE INDEX IF NOT EXISTS idx_attendance_scan_method ON event_attendance(scan_method);

COMMENT ON TABLE event_attendance IS 'Records of user attendance at events with scan method and location tracking';
COMMENT ON COLUMN event_attendance.scan_method IS 'Method used to record attendance: NFC, QR, or Manual';
COMMENT ON COLUMN event_attendance.marked_by IS 'User who marked the attendance (Attendance Taker/Admin/Owner)';
COMMENT ON COLUMN event_attendance.location_lat IS 'Optional: Latitude where attendance was marked';
COMMENT ON COLUMN event_attendance.location_lng IS 'Optional: Longitude where attendance was marked';

-- ============================================================================
-- STEP 4: CREATE HELPER FUNCTIONS
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Function: can_user_write_tag
-- Purpose: Check if a user is allowed to write a new tag based on cooldown
-- Parameters: p_user_id - The user's UUID
-- Returns: JSON object with 'can_write' boolean and 'next_available_date'
-- Cooldown: 14 days (configurable via constant in function)
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION can_user_write_tag(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
    v_last_write_date TIMESTAMP WITH TIME ZONE;
    v_cooldown_days INTEGER := 14; -- DEVELOPER NOTE: Modify this value to change cooldown period
    v_next_available_date TIMESTAMP WITH TIME ZONE;
    v_can_write BOOLEAN;
BEGIN
    -- Get the most recent tag write date for this user
    SELECT written_at INTO v_last_write_date
    FROM user_tag_writes
    WHERE user_id = p_user_id
    ORDER BY written_at DESC
    LIMIT 1;
    
    -- If no previous writes, user can write immediately
    IF v_last_write_date IS NULL THEN
        RETURN json_build_object(
            'can_write', TRUE,
            'next_available_date', NULL,
            'last_write_date', NULL,
            'cooldown_days', v_cooldown_days
        );
    END IF;
    
    -- Calculate next available write date
    v_next_available_date := v_last_write_date + (v_cooldown_days || ' days')::INTERVAL;
    
    -- Check if cooldown period has passed
    v_can_write := NOW() >= v_next_available_date;
    
    RETURN json_build_object(
        'can_write', v_can_write,
        'next_available_date', v_next_available_date,
        'last_write_date', v_last_write_date,
        'cooldown_days', v_cooldown_days
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION can_user_write_tag IS 'Checks if user can write a new tag based on 14-day cooldown period';

-- ----------------------------------------------------------------------------
-- Function: generate_and_assign_tag
-- Purpose: Generate a new tag ID, assign it to user, and record the write
-- Parameters: p_user_id - The user's UUID
-- Returns: JSON object with new tag_id and write record
-- Note: This function enforces the cooldown period
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION generate_and_assign_tag(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
    v_new_tag_id UUID;
    v_can_write_result JSON;
    v_can_write BOOLEAN;
    v_write_record_id UUID;
BEGIN
    -- Check if user can write a new tag
    v_can_write_result := can_user_write_tag(p_user_id);
    v_can_write := (v_can_write_result->>'can_write')::BOOLEAN;
    
    IF NOT v_can_write THEN
        RAISE EXCEPTION 'Cannot write tag. Cooldown period not elapsed. Next available: %', 
            v_can_write_result->>'next_available_date';
    END IF;
    
    -- Generate new UUID for tag
    v_new_tag_id := gen_random_uuid();
    
    -- Update user's tag_id
    UPDATE users 
    SET tag_id = v_new_tag_id::TEXT,
        updated_at = NOW()
    WHERE id = p_user_id;
    
    -- Record the tag write in history
    INSERT INTO user_tag_writes (user_id, tag_id, written_at)
    VALUES (p_user_id, v_new_tag_id::TEXT, NOW())
    RETURNING id INTO v_write_record_id;
    
    RETURN json_build_object(
        'success', TRUE,
        'tag_id', v_new_tag_id,
        'write_record_id', v_write_record_id,
        'written_at', NOW()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION generate_and_assign_tag IS 'Generates new tag ID for user if cooldown period has elapsed';

-- ----------------------------------------------------------------------------
-- Function: get_tag_write_history
-- Purpose: Get tag write history for a user
-- Parameters: p_user_id - The user's UUID, p_limit - Number of records to return
-- Returns: JSON array of write records
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION get_tag_write_history(p_user_id UUID, p_limit INTEGER DEFAULT 10)
RETURNS JSON AS $$
BEGIN
    RETURN (
        SELECT json_agg(row_to_json(t))
        FROM (
            SELECT id, tag_id, written_at, created_at
            FROM user_tag_writes
            WHERE user_id = p_user_id
            ORDER BY written_at DESC
            LIMIT p_limit
        ) t
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_tag_write_history IS 'Returns tag write history for a user';

-- ----------------------------------------------------------------------------
-- Function: mark_attendance
-- Purpose: Mark a user's attendance at an event
-- Parameters: p_event_id, p_user_id, p_marked_by, p_scan_method, p_location_lat, p_location_lng, p_notes
-- Returns: JSON object with attendance record
-- Note: Prevents duplicate attendance marking
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION mark_attendance(
    p_event_id UUID,
    p_user_id UUID,
    p_marked_by UUID,
    p_scan_method TEXT,
    p_location_lat DECIMAL DEFAULT NULL,
    p_location_lng DECIMAL DEFAULT NULL,
    p_notes TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    v_attendance_id UUID;
    v_existing_attendance UUID;
    v_event_org_id UUID;
    v_user_is_member BOOLEAN;
    v_marker_can_take_attendance BOOLEAN;
BEGIN
    -- Check if attendance already exists
    SELECT id INTO v_existing_attendance
    FROM event_attendance
    WHERE event_id = p_event_id AND user_id = p_user_id;
    
    IF v_existing_attendance IS NOT NULL THEN
        RAISE EXCEPTION 'Attendance already marked for this user at this event';
    END IF;
    
    -- Get event's organization
    SELECT organization_id INTO v_event_org_id
    FROM events
    WHERE id = p_event_id;
    
    IF v_event_org_id IS NULL THEN
        RAISE EXCEPTION 'Event not found';
    END IF;
    
    -- Verify user is a member of the organization
    v_user_is_member := is_org_member(v_event_org_id, p_user_id);
    
    IF NOT v_user_is_member THEN
        RAISE EXCEPTION 'User is not a member of the organization';
    END IF;
    
    -- Verify marker has permission to take attendance
    v_marker_can_take_attendance := user_has_permission(p_marked_by, v_event_org_id, 'Attendance Taker');
    
    IF NOT v_marker_can_take_attendance THEN
        RAISE EXCEPTION 'Marker does not have permission to take attendance';
    END IF;
    
    -- Insert attendance record
    INSERT INTO event_attendance (
        event_id, user_id, marked_by, scan_method,
        location_lat, location_lng, notes, marked_at
    )
    VALUES (
        p_event_id, p_user_id, p_marked_by, p_scan_method,
        p_location_lat, p_location_lng, p_notes, NOW()
    )
    RETURNING id INTO v_attendance_id;
    
    RETURN json_build_object(
        'success', TRUE,
        'attendance_id', v_attendance_id,
        'marked_at', NOW()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION mark_attendance IS 'Marks user attendance at an event with duplicate prevention and permission checks';

-- ----------------------------------------------------------------------------
-- Function: get_event_attendance_count
-- Purpose: Get total attendance count for an event
-- Parameters: p_event_id - The event's UUID
-- Returns: Integer count of attendees
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION get_event_attendance_count(p_event_id UUID)
RETURNS INTEGER AS $$
DECLARE
    v_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_count
    FROM event_attendance
    WHERE event_id = p_event_id;
    
    RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_event_attendance_count IS 'Returns total attendance count for an event';

-- ----------------------------------------------------------------------------
-- Function: get_event_member_count
-- Purpose: Get total member count for an event's organization
-- Parameters: p_event_id - The event's UUID
-- Returns: Integer count of organization members
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION get_event_member_count(p_event_id UUID)
RETURNS INTEGER AS $$
DECLARE
    v_org_id UUID;
    v_count INTEGER;
BEGIN
    -- Get organization ID from event
    SELECT organization_id INTO v_org_id
    FROM events
    WHERE id = p_event_id;
    
    IF v_org_id IS NULL THEN
        RETURN 0;
    END IF;
    
    -- Get member count for organization
    SELECT COUNT(*) INTO v_count
    FROM organization_members
    WHERE organization_id = v_org_id;
    
    RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_event_member_count IS 'Returns total member count for an events organization';

-- ----------------------------------------------------------------------------
-- Function: is_user_attended
-- Purpose: Check if a user has attended a specific event
-- Parameters: p_event_id, p_user_id
-- Returns: Boolean
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION is_user_attended(p_event_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_attended BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1
        FROM event_attendance
        WHERE event_id = p_event_id AND user_id = p_user_id
    ) INTO v_attended;
    
    RETURN v_attended;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION is_user_attended IS 'Checks if a user has attended a specific event';

-- ----------------------------------------------------------------------------
-- Function: can_take_attendance
-- Purpose: Check if a user can take attendance for an event
-- Parameters: p_event_id, p_user_id
-- Returns: Boolean
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION can_take_attendance(p_event_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_org_id UUID;
    v_can_take BOOLEAN;
BEGIN
    -- Get organization ID from event
    SELECT organization_id INTO v_org_id
    FROM events
    WHERE id = p_event_id;
    
    IF v_org_id IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Check if user has Attendance Taker permission or higher
    v_can_take := user_has_permission(p_user_id, v_org_id, 'Attendance Taker');
    
    RETURN v_can_take;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION can_take_attendance IS 'Checks if user has permission to take attendance for an event';

-- ============================================================================
-- STEP 5: CREATE DATABASE VIEWS
-- ============================================================================

-- ----------------------------------------------------------------------------
-- View: attendance_with_details
-- Purpose: Join attendance with user and event details for easy querying
-- ----------------------------------------------------------------------------

CREATE OR REPLACE VIEW attendance_with_details AS
SELECT 
    ea.id,
    ea.event_id,
    ea.user_id,
    ea.marked_at,
    ea.marked_by,
    ea.scan_method,
    ea.location_lat,
    ea.location_lng,
    ea.notes,
    ea.created_at,
    ea.updated_at,
    -- User (attendee) details
    u.name AS user_name,
    u.email AS user_email,
    u.user_type AS user_type,
    -- Event details
    e.event_name,
    e.date AS event_date,
    e.location AS event_location,
    e.organization_id,
    -- Marker (who took attendance) details
    marker.name AS marked_by_name,
    marker.email AS marked_by_email,
    -- Organization details
    org.name AS organization_name
FROM event_attendance ea
JOIN users u ON ea.user_id = u.id
JOIN events e ON ea.event_id = e.id
JOIN users marker ON ea.marked_by = marker.id
JOIN organizations org ON e.organization_id = org.id;

COMMENT ON VIEW attendance_with_details IS 'Complete attendance records with user, event, and organization details';

-- ----------------------------------------------------------------------------
-- View: event_attendance_summary
-- Purpose: Summary statistics for each event's attendance
-- ----------------------------------------------------------------------------

CREATE OR REPLACE VIEW event_attendance_summary AS
SELECT 
    e.id AS event_id,
    e.event_name,
    e.date AS event_date,
    e.organization_id,
    org.name AS organization_name,
    COUNT(ea.id) AS total_attended,
    get_event_member_count(e.id) AS total_members,
    CASE 
        WHEN get_event_member_count(e.id) > 0 THEN
            ROUND((COUNT(ea.id)::DECIMAL / get_event_member_count(e.id)::DECIMAL) * 100, 2)
        ELSE 0
    END AS attendance_percentage,
    COUNT(CASE WHEN ea.scan_method = 'NFC' THEN 1 END) AS nfc_scans,
    COUNT(CASE WHEN ea.scan_method = 'QR' THEN 1 END) AS qr_scans,
    COUNT(CASE WHEN ea.scan_method = 'Manual' THEN 1 END) AS manual_entries,
    MAX(ea.marked_at) AS last_attendance_marked
FROM events e
LEFT JOIN event_attendance ea ON e.id = ea.event_id
JOIN organizations org ON e.organization_id = org.id
GROUP BY e.id, e.event_name, e.date, e.organization_id, org.name;

COMMENT ON VIEW event_attendance_summary IS 'Attendance statistics and summary for each event';

-- ----------------------------------------------------------------------------
-- View: user_attendance_stats
-- Purpose: Attendance statistics per user per organization
-- ----------------------------------------------------------------------------

CREATE OR REPLACE VIEW user_attendance_stats AS
SELECT 
    u.id AS user_id,
    u.name AS user_name,
    u.email AS user_email,
    om.organization_id,
    org.name AS organization_name,
    COUNT(DISTINCT e.id) AS total_events,
    COUNT(DISTINCT ea.id) AS events_attended,
    COUNT(DISTINCT e.id) - COUNT(DISTINCT ea.id) AS events_missed,
    CASE 
        WHEN COUNT(DISTINCT e.id) > 0 THEN
            ROUND((COUNT(DISTINCT ea.id)::DECIMAL / COUNT(DISTINCT e.id)::DECIMAL) * 100, 2)
        ELSE 0
    END AS attendance_rate
FROM users u
JOIN organization_members om ON u.id = om.user_id
JOIN organizations org ON om.organization_id = org.id
LEFT JOIN events e ON e.organization_id = om.organization_id
LEFT JOIN event_attendance ea ON ea.event_id = e.id AND ea.user_id = u.id
GROUP BY u.id, u.name, u.email, om.organization_id, org.name;

COMMENT ON VIEW user_attendance_stats IS 'Attendance statistics per user per organization';

-- ============================================================================
-- STEP 6: ENABLE ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE user_tag_writes ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_attendance ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 7: CREATE RLS POLICIES
-- ============================================================================

-- ----------------------------------------------------------------------------
-- RLS POLICIES FOR user_tag_writes
-- ----------------------------------------------------------------------------

-- Users can view their own tag write history
CREATE POLICY users_can_view_own_tag_writes
ON user_tag_writes FOR SELECT
USING (user_id = auth.uid());

-- Users can insert their own tag writes (through function only, but allow for transparency)
CREATE POLICY users_can_insert_own_tag_writes
ON user_tag_writes FOR INSERT
WITH CHECK (user_id = auth.uid());

-- No updates or deletes allowed (immutable history)
-- Users cannot delete their tag write history

COMMENT ON POLICY users_can_view_own_tag_writes ON user_tag_writes IS 'Users can view their own tag write history';
COMMENT ON POLICY users_can_insert_own_tag_writes ON user_tag_writes IS 'Users can record their own tag writes';

-- ----------------------------------------------------------------------------
-- RLS POLICIES FOR event_attendance
-- ----------------------------------------------------------------------------

-- Members can view attendance for events in their organizations
CREATE POLICY members_can_view_org_event_attendance
ON event_attendance FOR SELECT
USING (
    EXISTS (
        SELECT 1
        FROM events e
        WHERE e.id = event_id
        AND is_org_member(e.organization_id, auth.uid())
    )
);

-- Attendance Takers, Admins, and Owners can create attendance records
CREATE POLICY attendance_takers_can_create_attendance
ON event_attendance FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM events e
        WHERE e.id = event_id
        AND user_has_permission(auth.uid(), e.organization_id, 'Attendance Taker')
    )
    AND marked_by = auth.uid()
);

-- Admins and Owners can delete attendance records (for corrections)
CREATE POLICY admins_can_delete_attendance
ON event_attendance FOR DELETE
USING (
    EXISTS (
        SELECT 1
        FROM events e
        WHERE e.id = event_id
        AND user_has_permission(auth.uid(), e.organization_id, 'Admin')
    )
);

-- Admins and Owners can update attendance records (for corrections)
CREATE POLICY admins_can_update_attendance
ON event_attendance FOR UPDATE
USING (
    EXISTS (
        SELECT 1
        FROM events e
        WHERE e.id = event_id
        AND user_has_permission(auth.uid(), e.organization_id, 'Admin')
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM events e
        WHERE e.id = event_id
        AND user_has_permission(auth.uid(), e.organization_id, 'Admin')
    )
);

COMMENT ON POLICY members_can_view_org_event_attendance ON event_attendance IS 'Organization members can view attendance for their events';
COMMENT ON POLICY attendance_takers_can_create_attendance ON event_attendance IS 'Attendance Takers and above can mark attendance';
COMMENT ON POLICY admins_can_delete_attendance ON event_attendance IS 'Admins and Owners can delete attendance for corrections';
COMMENT ON POLICY admins_can_update_attendance ON event_attendance IS 'Admins and Owners can update attendance for corrections';

-- ============================================================================
-- STEP 8: CREATE TRIGGERS
-- ============================================================================

-- Auto-update updated_at timestamp for event_attendance
CREATE TRIGGER update_event_attendance_updated_at
    BEFORE UPDATE ON event_attendance
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TRIGGER update_event_attendance_updated_at ON event_attendance IS 'Automatically updates updated_at timestamp';

-- ============================================================================
-- STEP 9: GRANT PERMISSIONS
-- ============================================================================

-- Grant access to authenticated users
GRANT SELECT, INSERT ON user_tag_writes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON event_attendance TO authenticated;

-- Grant access to views
GRANT SELECT ON attendance_with_details TO authenticated;
GRANT SELECT ON event_attendance_summary TO authenticated;
GRANT SELECT ON user_attendance_stats TO authenticated;

-- Grant execute on functions
GRANT EXECUTE ON FUNCTION can_user_write_tag TO authenticated;
GRANT EXECUTE ON FUNCTION generate_and_assign_tag TO authenticated;
GRANT EXECUTE ON FUNCTION get_tag_write_history TO authenticated;
GRANT EXECUTE ON FUNCTION mark_attendance TO authenticated;
GRANT EXECUTE ON FUNCTION get_event_attendance_count TO authenticated;
GRANT EXECUTE ON FUNCTION get_event_member_count TO authenticated;
GRANT EXECUTE ON FUNCTION is_user_attended TO authenticated;
GRANT EXECUTE ON FUNCTION can_take_attendance TO authenticated;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

COMMIT;

-- ============================================================================
-- POST-MIGRATION VERIFICATION QUERIES
-- ============================================================================
-- Run these queries after migration to verify everything is working:

/*
-- Verify new tables exist
SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename IN ('user_tag_writes', 'event_attendance');

-- Verify new columns exist
SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'tag_id';

-- Verify functions exist
SELECT routine_name FROM information_schema.routines WHERE routine_schema = 'public' AND routine_name LIKE '%tag%' OR routine_name LIKE '%attendance%';

-- Verify views exist
SELECT viewname FROM pg_views WHERE schemaname = 'public' AND viewname LIKE '%attendance%';

-- Verify RLS policies exist
SELECT tablename, policyname FROM pg_policies WHERE tablename IN ('user_tag_writes', 'event_attendance');

-- Test tag write functionality (replace user_id with actual UUID)
-- SELECT can_user_write_tag('your-user-id-here');

-- Test attendance count
-- SELECT get_event_attendance_count('your-event-id-here');
*/
