'use client'

import { useState, useEffect, useCallback } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { MapPin, TrendingUp, Loader2 } from 'lucide-react'
import { getLocationSuggestions, type LocationSuggestion } from '@/lib/services/location-autocomplete'
import { cn } from '@/lib/utils'

interface LocationAutocompleteProps {
  organizationId: string
  value: string
  onChange: (value: string) => void
  onCoordinatesChange?: (lat: number, lng: number) => void
  latitude?: number | null
  longitude?: number | null
  disabled?: boolean
  className?: string
}

export function LocationAutocomplete({
  organizationId,
  value,
  onChange,
  onCoordinatesChange,
  latitude,
  longitude,
  disabled = false,
  className,
}: LocationAutocompleteProps) {
  const [open, setOpen] = useState(false)
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([])
  const [loading, setLoading] = useState(false)
  const [inputValue, setInputValue] = useState(value)

  // Fetch suggestions when input changes or coordinates change
  const fetchSuggestions = useCallback(async () => {
    if (!organizationId) return

    setLoading(true)
    try {
      const results = await getLocationSuggestions(
        organizationId,
        inputValue || null,
        latitude,
        longitude,
        50 // 50m radius
      )
      setSuggestions(results)
    } catch (error) {
      console.error('Error fetching suggestions:', error)
      setSuggestions([])
    } finally {
      setLoading(false)
    }
  }, [organizationId, inputValue, latitude, longitude])

  // Fetch suggestions on mount and when dependencies change
  useEffect(() => {
    if (organizationId) {
      fetchSuggestions()
    }
  }, [fetchSuggestions, organizationId])

  // Sync internal input value with prop value
  useEffect(() => {
    setInputValue(value)
  }, [value])

  const handleInputChange = (newValue: string) => {
    setInputValue(newValue)
    onChange(newValue)
    // Auto-open when typing if we have or might have suggestions
    if (newValue.length > 0) {
      setOpen(true)
    }
  }

  const handleSelectSuggestion = (suggestion: LocationSuggestion) => {
    setInputValue(suggestion.location)
    onChange(suggestion.location)
    // Also update coordinates if callback provided
    if (onCoordinatesChange) {
      onCoordinatesChange(suggestion.latitude, suggestion.longitude)
    }
    setOpen(false)
  }

  const formatUsageCount = (count: number) => {
    if (count === 1) return '1 time'
    if (count < 10) return `${count} times`
    return `${count}+ times`
  }

  return (
    <div className={cn('space-y-2', className)}>
      <Label htmlFor="location" className="text-sm font-medium text-foreground flex items-center gap-2">
        <MapPin className="h-4 w-4" />
        Location
      </Label>
      
      <div className="relative">
        <Input
          id="location"
          type="text"
          value={inputValue}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={() => {
            // Only open if we have suggestions to show
            if (suggestions.length > 0) {
              setOpen(true)
            }
          }}
          onBlur={() => {
            // Delay closing to allow click on suggestions
            setTimeout(() => setOpen(false), 200)
          }}
          placeholder="e.g., Main Conference Hall, Building A"
          className="w-full"
          maxLength={500}
          disabled={disabled}
        />
        {loading && (
          <Loader2 className="h-4 w-4 animate-spin absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        )}
        
        {/* Suggestions dropdown - only show when open and has suggestions */}
        {open && suggestions.length > 0 && (
          <div 
            className="absolute z-[1000] w-full mt-1 max-h-60 overflow-auto rounded-md border bg-popover text-popover-foreground shadow-md"
            onMouseDown={(e) => e.preventDefault()} // Prevent input blur when clicking suggestions
          >
            <div className="p-1">
              <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                Suggested Locations
              </div>
              {suggestions.map((suggestion, index) => (
                <button
                  key={`${suggestion.location}-${index}`}
                  type="button"
                  onClick={() => handleSelectSuggestion(suggestion)}
                  className="w-full text-left px-2 py-2 rounded-sm hover:bg-accent hover:text-accent-foreground cursor-pointer transition-colors flex items-start justify-between gap-2"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="font-medium text-sm truncate">{suggestion.location}</span>
                    </div>
                    {suggestion.distance_meters !== null && (
                      <p className="text-xs text-muted-foreground ml-6 mt-0.5">
                        {suggestion.distance_meters < 1000 
                          ? `${Math.round(suggestion.distance_meters)}m away`
                          : `${(suggestion.distance_meters / 1000).toFixed(1)}km away`
                        }
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                    <TrendingUp className="h-3 w-3" />
                    <span>{formatUsageCount(suggestion.usage_count)}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
      
      <p className="text-xs text-muted-foreground">
        {inputValue.length}/500 characters
        {suggestions.length > 0 && !loading && (
          <span className="ml-2">• {suggestions.length} suggestion{suggestions.length !== 1 ? 's' : ''} available</span>
        )}
      </p>
    </div>
  )
}

