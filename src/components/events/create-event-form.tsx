'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { DateTimePicker } from '@/components/ui/datetime-picker'
import { Calendar, MapPin, FileText, ArrowLeft, Loader2, Building2, Clock, Crosshair, Ruler } from 'lucide-react'
import { MapPicker } from '@/components/events/map-picker'
import type { OrganizationWithRole } from '@/types/organization'

interface CreateEventFormProps {
  organizationId?: string
  organizationName?: string
  organizations?: OrganizationWithRole[]
}

export function CreateEventForm({ organizationId, organizationName, organizations }: CreateEventFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedOrgId, setSelectedOrgId] = useState<string>('')

  const [formData, setFormData] = useState({
    event_name: '',
    location: '',
    description: '',
  })
  
  const [eventDate, setEventDate] = useState<Date | undefined>(undefined)
  const [eventEnd, setEventEnd] = useState<Date | undefined>(undefined)

  // Geolocation feature state
  const [enableGeo, setEnableGeo] = useState(false)
  const [restrictRadius, setRestrictRadius] = useState(false)
  const [latitude, setLatitude] = useState<number | null>(null)
  const [longitude, setLongitude] = useState<number | null>(null)
  const [radius, setRadius] = useState<number>(250) // default 250m

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    setError(null) // Clear error on input change
  }

  const validateForm = (): string | null => {
    // Validate organization selection (only for global mode)
    if (!organizationId && !selectedOrgId) {
      return 'Please select an organization to publish the event to'
    }

    // Validate event name (3-200 characters)
    if (!formData.event_name.trim()) {
      return 'Event name is required'
    }
    if (formData.event_name.length < 3) {
      return 'Event name must be at least 3 characters long'
    }
    if (formData.event_name.length > 200) {
      return 'Event name must not exceed 200 characters'
    }

    // Validate date
    if (!eventDate) {
      return 'Event date and time is required'
    }
    if (isNaN(eventDate.getTime())) {
      return 'Invalid date format'
    }

    // Validate that event_end is after event date if provided
    if (eventEnd) {
      if (eventDate >= eventEnd) {
        return 'Event End must be after Event Date and Time'
      }
    }

    // Validate location (max 500 characters)
    if (formData.location && formData.location.length > 500) {
      return 'Location must not exceed 500 characters'
    }

    // Validate description (max 2000 characters)
    if (formData.description && formData.description.length > 2000) {
      return 'Description must not exceed 2000 characters'
    }

    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Validate form
    const validationError = validateForm()
    if (validationError) {
      setError(validationError)
      return
    }

    setLoading(true)

    try {
      // Use organizationId from props if available (org-specific mode), otherwise use selected org (global mode)
      const targetOrgId = organizationId || selectedOrgId

      const requestBody: any = {
        event_name: formData.event_name,
        date: eventDate!.toISOString(),
        organization_id: targetOrgId,
        location: formData.location || null,
        description: formData.description || null,
      }
      // Geolocation fields
      if (enableGeo) {
        requestBody.latitude = latitude
        requestBody.longitude = longitude
      }
      if (enableGeo && restrictRadius) {
        requestBody.attendance_radius_meters = radius
      }

      // If event_end is provided, use eventDate as event_start
      if (eventEnd) {
        requestBody.event_start = eventDate!.toISOString()
        requestBody.event_end = eventEnd.toISOString()
      }

      const response = await fetch('/api/event', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create event')
      }

      const data = await response.json()
      
      // Redirect to event detail page to confirm creation
      if (data && data.id) {
        router.push(`/organizations/${targetOrgId}/events/${data.id}`)
      } else {
        // Fallback to events list if no event ID returned
        router.push(`/organizations/${targetOrgId}/events`)
      }
      router.refresh()
    } catch (err) {
      console.error('Error creating event:', err)
      setError(err instanceof Error ? err.message : 'Failed to create event')
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    if (organizationId) {
      // If in org-specific mode, go back to that org's events
      router.push(`/organizations/${organizationId}/events`)
    } else {
      // If in global mode, go back to dashboard
      router.push('/dashboard')
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="icon"
          onClick={handleCancel}
          className="h-10 w-10"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Create New Event</h1>
          {organizationName && (
            <p className="text-sm text-muted-foreground">for {organizationName}</p>
          )}
        </div>
      </div>

      {/* Form Card */}
      <Card className="bg-card shadow-md">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-foreground">
            Event Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Organization Selector (only shown in global mode) */}
            {!organizationId && (
              <div className="space-y-2">
                <Label htmlFor="organization" className="text-sm font-medium text-foreground flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Organization *
                </Label>
                {organizations && organizations.length > 0 ? (
                  <select
                    id="organization"
                    className="h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-xs transition-colors outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
                    value={selectedOrgId}
                    onChange={(e) => {
                      setSelectedOrgId(e.target.value)
                      setError(null)
                    }}
                    disabled={loading}
                    required
                  >
                    <option value="">Select an organization</option>
                    {organizations.map((org) => (
                      <option key={org.id} value={org.id}>
                        {org.name} {org.tag ? `(${org.tag})` : ''} - {org.user_role}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="h-9 w-full rounded-md border border-input bg-muted px-3 py-1 text-sm text-muted-foreground flex items-center">
                    No organizations available to publish to
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  Select the organization where you want to publish this event
                </p>
              </div>
            )}

            {/* Event Name */}
            <div className="space-y-2">
              <Label htmlFor="event_name" className="text-sm font-medium text-foreground">
                Event Name *
              </Label>
              <Input
                id="event_name"
                name="event_name"
                type="text"
                value={formData.event_name}
                onChange={handleInputChange}
                placeholder="e.g., Annual General Meeting"
                className="w-full"
                required
                minLength={3}
                maxLength={200}
              />
              <p className="text-xs text-muted-foreground">
                {formData.event_name.length}/200 characters
              </p>
            </div>

            {/* Date and Time */}
            <div className="space-y-2">
              <Label htmlFor="date" className="text-sm font-medium text-foreground flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Event Date and Time *
              </Label>
              <DateTimePicker
                date={eventDate}
                setDate={setEventDate}
                placeholder="Pick event date and time"
                disabled={loading}
              />
              <p className="text-xs text-muted-foreground">
                When the event starts (also when attendance tracking begins)
              </p>
            </div>

            {/* Event End (Attendance Window End) */}
            <div className="space-y-2">
              <Label htmlFor="event_end" className="text-sm font-medium text-foreground flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Event End (Optional)
              </Label>
              <DateTimePicker
                date={eventEnd}
                setDate={setEventEnd}
                placeholder="When does attendance close?"
                disabled={loading}
              />
              <p className="text-xs text-muted-foreground">
                When attendance tracking ends
              </p>
            </div>

            {/* Attendance Window Helper Text */}
            {eventEnd && (
              <div className="bg-muted/50 border border-border rounded-lg p-4">
                <p className="text-sm text-muted-foreground">
                  <strong>ℹ️ Attendance Window:</strong> Attendance can be taken from the Event Date and Time until the Event End. 
                  Leave Event End blank if this is a reminder-only event with no attendance tracking.
                </p>
              </div>
            )}

            {/* Location */}
            <div className="space-y-2">
              <Label htmlFor="location" className="text-sm font-medium text-foreground flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Location
              </Label>
              <Input
                id="location"
                name="location"
                type="text"
                value={formData.location}
                onChange={handleInputChange}
                placeholder="e.g., Main Conference Hall, Building A"
                className="w-full"
                maxLength={500}
              />
              <p className="text-xs text-muted-foreground">
                {formData.location.length}/500 characters
              </p>
            </div>

            {/* Enable precise map location */}
            <div className="space-y-2 border rounded-md p-4">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <Crosshair className="h-4 w-4" /> Precise Map Location (Optional)
                </Label>
                <input
                  type="checkbox"
                  className="h-4 w-4"
                  checked={enableGeo}
                  onChange={(e) => setEnableGeo(e.target.checked)}
                  disabled={loading}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Toggle to pin exact event location on a map.
              </p>
              {enableGeo && (
                <div className="space-y-3">
                  <MapPicker
                    latitude={latitude}
                    longitude={longitude}
                    onChange={(lat, lng) => {
                      setLatitude(lat)
                      setLongitude(lng)
                    }}
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Latitude</Label>
                      <Input
                        value={latitude ?? ''}
                        onChange={(e) => setLatitude(e.target.value ? parseFloat(e.target.value) : null)}
                        placeholder="Latitude"
                        type="number"
                        step="0.000001"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Longitude</Label>
                      <Input
                        value={longitude ?? ''}
                        onChange={(e) => setLongitude(e.target.value ? parseFloat(e.target.value) : null)}
                        placeholder="Longitude"
                        type="number"
                        step="0.000001"
                      />
                    </div>
                  </div>
                  {/* Restrict radius */}
                  <div className="space-y-2 mt-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium flex items-center gap-2">
                        <Ruler className="h-4 w-4" /> Restrict Attendance Radius
                      </Label>
                      <input
                        type="checkbox"
                        className="h-4 w-4"
                        checked={restrictRadius}
                        onChange={(e) => setRestrictRadius(e.target.checked)}
                        disabled={loading || latitude == null || longitude == null}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Only allow attendance marking within selected distance.
                    </p>
                    {restrictRadius && (
                      <div className="space-y-1">
                        <input
                          type="range"
                          min={100}
                          max={1000}
                          step={50}
                          value={radius}
                          onChange={(e) => setRadius(parseInt(e.target.value))}
                          className="w-full"
                        />
                        <p className="text-xs text-muted-foreground">Radius: {radius} meters</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description" className="text-sm font-medium text-foreground flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Description
              </Label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Provide more details about the event..."
                className="w-full min-h-[120px] px-3 py-2 border border-input bg-background text-foreground rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent resize-y"
                maxLength={2000}
              />
              <p className="text-xs text-muted-foreground">
                {formData.description.length}/2000 characters
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-destructive/10 border border-destructive/30 text-destructive px-4 py-3 rounded-md text-sm">
                {error}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center gap-3 pt-4">
              <Button
                type="submit"
                disabled={loading}
                className="bg-primary hover:bg-primary/90 text-primary-foreground px-6"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Event'
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                disabled={loading}
              >
                Cancel
              </Button>
            </div>

            {/* Required Field Note */}
            <p className="text-xs text-muted-foreground">
              * Required fields
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
