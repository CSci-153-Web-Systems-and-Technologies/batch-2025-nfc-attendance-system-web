import { createClient } from '@/lib/client'

export interface LocationSuggestion {
  location: string
  latitude: number
  longitude: number
  usage_count: number
  distance_meters: number | null
  relevance_score: number
}

/**
 * Fetches location suggestions for autocomplete based on organization history
 * @param organizationId - The organization to fetch suggestions for
 * @param searchText - Optional search text to filter and rank suggestions
 * @param centerLat - Optional center latitude for proximity-based ranking
 * @param centerLng - Optional center longitude for proximity-based ranking
 * @param radiusMeters - Radius in meters for nearby suggestions (default: 50)
 * @returns Array of ranked location suggestions
 */
export async function getLocationSuggestions(
  organizationId: string,
  searchText?: string | null,
  centerLat?: number | null,
  centerLng?: number | null,
  radiusMeters: number = 50
): Promise<LocationSuggestion[]> {
  const supabase = createClient()

  try {
    const { data, error } = await supabase.rpc('get_location_suggestions', {
      p_organization_id: organizationId,
      p_search_text: searchText || null,
      p_center_lat: centerLat || null,
      p_center_lng: centerLng || null,
      p_radius_meters: radiusMeters,
    })

    if (error) {
      console.error('Error fetching location suggestions:', error)
      return []
    }

    return (data || []) as LocationSuggestion[]
  } catch (err) {
    console.error('Failed to fetch location suggestions:', err)
    return []
  }
}

/**
 * Fetches all historical event locations for an organization (for map display)
 * Returns unique locations with their coordinates and usage counts
 * @param organizationId - The organization to fetch locations for
 * @returns Array of all historical locations
 */
export async function getHistoricalLocations(
  organizationId: string
): Promise<LocationSuggestion[]> {
  const supabase = createClient()

  try {
    // Get all unique locations by calling the function without search text or center point
    const { data, error } = await supabase.rpc('get_location_suggestions', {
      p_organization_id: organizationId,
      p_search_text: null,
      p_center_lat: null,
      p_center_lng: null,
      p_radius_meters: 999999, // Large radius to get all locations
    })

    if (error) {
      console.error('Error fetching historical locations:', error)
      return []
    }

    return (data || []) as LocationSuggestion[]
  } catch (err) {
    console.error('Failed to fetch historical locations:', err)
    return []
  }
}

/**
 * Finds the best matching location from a cluster based on search keyword or usage count
 * @param locations - Array of locations in the cluster
 * @param searchKeyword - Optional search keyword to prioritize matching locations
 * @returns The best matching location from the cluster
 */
export function getBestLocationFromCluster(
  locations: LocationSuggestion[],
  searchKeyword?: string | null
): LocationSuggestion | null {
  if (!locations || locations.length === 0) return null

  // If no search keyword, return the most popular (highest usage_count)
  if (!searchKeyword || searchKeyword.trim() === '') {
    return locations.reduce((best, current) =>
      current.usage_count > best.usage_count ? current : best
    )
  }

  // If search keyword exists, prioritize by relevance score first, then usage count
  const keyword = searchKeyword.toLowerCase().trim()
  
  // Score each location based on keyword match
  const scored = locations.map(loc => {
    const locationLower = loc.location.toLowerCase()
    let matchScore = 0

    // Exact match gets highest score
    if (locationLower === keyword) {
      matchScore = 1000
    }
    // Starts with keyword
    else if (locationLower.startsWith(keyword)) {
      matchScore = 500
    }
    // Contains keyword
    else if (locationLower.includes(keyword)) {
      matchScore = 250
    }

    // Combine match score with usage count
    const totalScore = matchScore + loc.usage_count * 10

    return { location: loc, totalScore }
  })

  // Sort by total score descending
  scored.sort((a, b) => b.totalScore - a.totalScore)

  return scored[0]?.location || locations[0]
}
