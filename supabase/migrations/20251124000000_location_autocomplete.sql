-- Enable PostGIS extension for spatial queries
CREATE EXTENSION IF NOT EXISTS postgis;

-- Add spatial index on events table for efficient location queries
CREATE INDEX IF NOT EXISTS idx_events_location_spatial 
ON events USING GIST (
  ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)
)
WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- Create function to get location suggestions for autocomplete
-- Returns locations from past events within the organization, ranked by:
-- - Exact text match (100 points)
-- - Partial text match (50 points)
-- - Usage count × 10
-- - Proximity bonus (closer = higher score)
CREATE OR REPLACE FUNCTION get_location_suggestions(
  p_organization_id UUID,
  p_search_text TEXT DEFAULT NULL,
  p_center_lat DOUBLE PRECISION DEFAULT NULL,
  p_center_lng DOUBLE PRECISION DEFAULT NULL,
  p_radius_meters INTEGER DEFAULT 50
)
RETURNS TABLE (
  location TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  usage_count BIGINT,
  distance_meters DOUBLE PRECISION,
  relevance_score INTEGER
) AS $$
BEGIN
  RETURN QUERY
  WITH location_groups AS (
    -- Group events by location text and approximate geographic position
    SELECT 
      e.location,
      AVG(e.latitude) AS avg_latitude,
      AVG(e.longitude) AS avg_longitude,
      COUNT(*) AS usage_count,
      CASE 
        WHEN p_center_lat IS NOT NULL AND p_center_lng IS NOT NULL THEN
          ST_Distance(
            ST_SetSRID(ST_MakePoint(AVG(e.longitude), AVG(e.latitude)), 4326)::geography,
            ST_SetSRID(ST_MakePoint(p_center_lng, p_center_lat), 4326)::geography
          )
        ELSE NULL
      END AS distance_meters
    FROM events e
    WHERE 
      e.organization_id = p_organization_id
      AND e.location IS NOT NULL 
      AND e.location != ''
      AND e.latitude IS NOT NULL 
      AND e.longitude IS NOT NULL
      -- If center point provided, filter by radius for nearby suggestions
      AND (
        p_center_lat IS NULL 
        OR ST_DWithin(
          ST_SetSRID(ST_MakePoint(e.longitude, e.latitude), 4326)::geography,
          ST_SetSRID(ST_MakePoint(p_center_lng, p_center_lat), 4326)::geography,
          p_radius_meters
        )
      )
    GROUP BY e.location
  ),
  scored_locations AS (
    SELECT 
      lg.location,
      lg.avg_latitude AS latitude,
      lg.avg_longitude AS longitude,
      lg.usage_count,
      lg.distance_meters,
      -- Calculate relevance score
      (
        -- Exact match bonus
        CASE WHEN p_search_text IS NOT NULL AND LOWER(lg.location) = LOWER(p_search_text) 
          THEN 100 ELSE 0 END
        +
        -- Partial match bonus
        CASE WHEN p_search_text IS NOT NULL AND LOWER(lg.location) LIKE '%' || LOWER(p_search_text) || '%' 
          THEN 50 ELSE 0 END
        +
        -- Usage count contribution (cap at 500 points from usage)
        LEAST((lg.usage_count * 10)::INTEGER, 500)
        +
        -- Proximity bonus (max 50 points for locations within 10m, decreasing to 0 at p_radius_meters)
        CASE 
          WHEN lg.distance_meters IS NOT NULL THEN
            GREATEST(0, (50 - (lg.distance_meters / p_radius_meters * 50))::INTEGER)
          ELSE 0
        END
      ) AS relevance_score
    FROM location_groups lg
  )
  SELECT 
    sl.location,
    sl.latitude,
    sl.longitude,
    sl.usage_count,
    sl.distance_meters,
    sl.relevance_score
  FROM scored_locations sl
  WHERE 
    -- If search text provided, only return matches
    p_search_text IS NULL 
    OR LOWER(sl.location) LIKE '%' || LOWER(p_search_text) || '%'
  ORDER BY 
    sl.relevance_score DESC,
    sl.usage_count DESC,
    sl.location ASC
  LIMIT 50;
END;
$$ LANGUAGE plpgsql STABLE;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION get_location_suggestions(UUID, TEXT, DOUBLE PRECISION, DOUBLE PRECISION, INTEGER) TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION get_location_suggestions IS 
'Returns ranked location suggestions for event creation autocomplete based on organization history, text search, and proximity to a center point. Scoring prioritizes exact/partial matches, usage frequency, and geographic proximity.';
