-- ============================================================================
-- NON-MEMBER ATTENDANCE MIGRATION
-- ============================================================================
-- Date: December 2, 2025
-- Description: Adds support for non-member (guest) attendance tracking
-- This migration:
--   1. Adds is_member column to event_attendance table
--   2. Updates mark_attendance function to allow non-members
--   3. Updates event_attendance_summary view to include guest counts
--   4. Updates attendance_with_details view to include is_member field
-- ============================================================================

-- ============================================================================
-- STEP 1: Add is_member column to event_attendance
-- ============================================================================

ALTER TABLE event_attendance
ADD COLUMN IF NOT EXISTS is_member BOOLEAN NOT NULL DEFAULT TRUE;

COMMENT ON COLUMN event_attendance.is_member IS 'Indicates if the attendee was a member of the organization at the time of attendance. FALSE = guest/non-member.';

-- ============================================================================
-- STEP 2: Update mark_attendance function to allow non-members
-- ============================================================================

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
    
    -- Check if user is a member of the organization (but don't require it)
    v_user_is_member := is_org_member(v_event_org_id, p_user_id);
    
    -- Verify marker has permission to take attendance
    v_marker_can_take_attendance := user_has_permission(p_marked_by, v_event_org_id, 'Attendance Taker');
    
    IF NOT v_marker_can_take_attendance THEN
        RAISE EXCEPTION 'Marker does not have permission to take attendance';
    END IF;
    
    -- Insert attendance record (now includes is_member flag)
    INSERT INTO event_attendance (
        event_id, user_id, marked_by, scan_method,
        location_lat, location_lng, notes, marked_at, is_member
    )
    VALUES (
        p_event_id, p_user_id, p_marked_by, p_scan_method,
        p_location_lat, p_location_lng, p_notes, NOW(), v_user_is_member
    )
    RETURNING id INTO v_attendance_id;
    
    RETURN json_build_object(
        'success', TRUE,
        'attendance_id', v_attendance_id,
        'marked_at', NOW(),
        'is_member', v_user_is_member
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION mark_attendance IS 'Marks user attendance at an event. Supports both members and non-members (guests). Auto-detects membership status.';

-- ============================================================================
-- STEP 3: Update event_attendance_summary view to include guest counts
-- ============================================================================

DROP VIEW IF EXISTS event_attendance_summary;

CREATE OR REPLACE VIEW event_attendance_summary AS
SELECT 
    e.id AS event_id,
    e.event_name,
    e.date AS event_date,
    e.organization_id,
    o.name AS organization_name,
    COALESCE(att.total_attended, 0) AS total_attended,
    COALESCE(mem.total_members, 0) AS total_members,
    CASE 
        WHEN COALESCE(mem.total_members, 0) = 0 THEN 0
        ELSE ROUND((COALESCE(att.total_attended, 0)::DECIMAL / mem.total_members) * 100, 1)
    END AS attendance_percentage,
    COALESCE(att.nfc_scans, 0) AS nfc_scans,
    COALESCE(att.qr_scans, 0) AS qr_scans,
    COALESCE(att.manual_entries, 0) AS manual_entries,
    COALESCE(att.member_count, 0) AS member_count,
    COALESCE(att.non_member_count, 0) AS non_member_count,
    att.last_attendance_marked
FROM events e
JOIN organizations o ON e.organization_id = o.id
LEFT JOIN (
    SELECT 
        event_id,
        COUNT(*) AS total_attended,
        COUNT(*) FILTER (WHERE scan_method = 'NFC') AS nfc_scans,
        COUNT(*) FILTER (WHERE scan_method = 'QR') AS qr_scans,
        COUNT(*) FILTER (WHERE scan_method = 'Manual') AS manual_entries,
        COUNT(*) FILTER (WHERE is_member = TRUE) AS member_count,
        COUNT(*) FILTER (WHERE is_member = FALSE) AS non_member_count,
        MAX(marked_at) AS last_attendance_marked
    FROM event_attendance
    GROUP BY event_id
) att ON e.id = att.event_id
LEFT JOIN (
    SELECT 
        organization_id,
        COUNT(*) AS total_members
    FROM organization_members
    GROUP BY organization_id
) mem ON e.organization_id = mem.organization_id;

COMMENT ON VIEW event_attendance_summary IS 'Summary statistics for event attendance including member and non-member (guest) counts';

-- ============================================================================
-- STEP 4: Update attendance_with_details view to include is_member
-- ============================================================================

DROP VIEW IF EXISTS attendance_with_details;

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
    ea.is_member,
    ea.created_at,
    ea.updated_at,
    u.name AS user_name,
    u.email AS user_email,
    u.user_type,
    e.event_name,
    e.date AS event_date,
    e.location AS event_location,
    e.organization_id,
    o.name AS organization_name,
    mb.name AS marked_by_name,
    mb.email AS marked_by_email
FROM event_attendance ea
JOIN users u ON ea.user_id = u.id
JOIN events e ON ea.event_id = e.id
JOIN organizations o ON e.organization_id = o.id
JOIN users mb ON ea.marked_by = mb.id;

COMMENT ON VIEW attendance_with_details IS 'Complete attendance records with user, event, organization details and member status';

-- ============================================================================
-- STEP 5: Grant permissions
-- ============================================================================

GRANT SELECT ON event_attendance_summary TO authenticated;
GRANT SELECT ON attendance_with_details TO authenticated;

-- ============================================================================
-- VERIFICATION QUERIES (Run these to verify the migration)
-- ============================================================================
/*
-- Check if is_member column was added
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'event_attendance' AND column_name = 'is_member';

-- Check if views were updated
SELECT * FROM event_attendance_summary LIMIT 1;
SELECT * FROM attendance_with_details LIMIT 1;

-- Test marking attendance for a non-member (replace with real IDs)
-- SELECT mark_attendance('event_uuid', 'non_member_user_uuid', 'marker_uuid', 'Manual');
*/
