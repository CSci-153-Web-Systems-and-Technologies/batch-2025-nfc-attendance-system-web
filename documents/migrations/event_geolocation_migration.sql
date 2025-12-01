-- Migration: Add geolocation and attendance radius restriction to events
-- Date: 2025-11-24
-- Description:
--   Adds optional latitude/longitude columns for precise event location and
--   an optional attendance_radius_meters column that, when set (100–1000 meters),
--   restricts attendance marking to users physically within the radius.
--   If attendance_radius_meters IS NULL, no geofencing restriction is applied.

ALTER TABLE events
  ADD COLUMN latitude double precision NULL,
  ADD COLUMN longitude double precision NULL,
  ADD COLUMN attendance_radius_meters integer NULL;

-- Constraint: radius must be between 100 and 1000 meters if provided
ALTER TABLE events
  ADD CONSTRAINT events_attendance_radius_check
  CHECK (
    attendance_radius_meters IS NULL OR
    (attendance_radius_meters >= 100 AND attendance_radius_meters <= 1000)
  );

-- Optional: simple index to allow future geospatial queries
CREATE INDEX IF NOT EXISTS idx_events_lat_long ON events(latitude, longitude);

-- Notes:
-- * Existing 'location' column continues to store human-readable description (building/room).
-- * New columns are nullable so existing events are unaffected.
-- * Client must supply latitude/longitude if attendance_radius_meters is set.
