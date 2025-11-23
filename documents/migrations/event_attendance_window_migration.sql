-- ============================================================================
-- EVENT ATTENDANCE WINDOW MIGRATION
-- ============================================================================
-- Date: November 20, 2025
-- Description: Add event_start and event_end columns to events table
--              to define attendance time windows
-- ============================================================================

-- Add event_start column (nullable timestamp with timezone)
-- This defines when attendance can begin being taken for the event
ALTER TABLE events
ADD COLUMN event_start timestamp with time zone;

-- Add event_end column (nullable timestamp with timezone)
-- This defines when attendance closes for the event
ALTER TABLE events
ADD COLUMN event_end timestamp with time zone;

-- Set default values for existing events
-- Both event_start and event_end are set to the existing date field
-- This ensures existing events have a consistent attendance window
UPDATE events
SET event_start = date,
    event_end = date
WHERE event_start IS NULL AND event_end IS NULL;

-- Add indexes for performance on time-based queries
CREATE INDEX idx_events_event_start ON events(event_start);
CREATE INDEX idx_events_event_end ON events(event_end);

-- Add comments to document the columns
COMMENT ON COLUMN events.event_start IS 'Start time when attendance can be taken (nullable - if null, event is reminder-only)';
COMMENT ON COLUMN events.event_end IS 'End time when attendance closes (nullable - if null, event is reminder-only)';

-- ============================================================================
-- NOTES
-- ============================================================================
-- * event_start and event_end are optional (nullable)
-- * When both are NULL, the event is a reminder-only event with no attendance tracking
-- * When set, attendance can only be marked between event_start and event_end
-- * The existing 'date' field remains as the event's scheduled date/time
-- * Time validation is enforced at the application level (event_start < event_end)
-- * Attendance validation checks are performed in attendance.service.ts
-- ============================================================================
