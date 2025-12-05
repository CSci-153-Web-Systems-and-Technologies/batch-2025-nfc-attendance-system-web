'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { DateTimePicker } from '@/components/ui/datetime-picker'
import { Calendar, MapPin, FileText, ArrowLeft, Loader2, Building2, Clock, Crosshair, Ruler, Upload, X, Image as ImageIcon, FileIcon } from 'lucide-react'
import { LocationAutocomplete } from '@/components/events/location-autocomplete'
import type { OrganizationWithRole } from '@/types/organization'

// Dynamically import MapPicker with SSR disabled to avoid Leaflet window errors
const MapPicker = dynamic(
  () => import('@/components/events/map-picker').then(mod => ({ default: mod.MapPicker })),
  { 
    ssr: false,
    loading: () => (
      <div className="h-64 w-full rounded-md border border-input bg-muted flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }
)

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

    // File upload state
    const [featuredImage, setFeaturedImage] = useState<File | null>(null)
    const [featuredImagePreview, setFeaturedImagePreview] = useState<string | null>(null)
    const [files, setFiles] = useState<File[]>([])
    const [fileErrors, setFileErrors] = useState<{ fileName: string; error: string }[]>([])

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    setError(null) // Clear error on input change
  }

    const handleFeaturedImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return

      // Validate file type
      if (!['image/jpeg', 'image/png'].includes(file.type)) {
        setError('Featured image must be JPEG or PNG')
        return
      }

      // Validate file size (20MB)
      if (file.size > 20 * 1024 * 1024) {
        setError(`Featured image size ${(file.size / 1024 / 1024).toFixed(2)}MB exceeds 20MB limit`)
        return
      }

      setFeaturedImage(file)
      setError(null)

      // Create preview
      const reader = new FileReader()
      reader.onload = (e) => {
        setFeaturedImagePreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }

    const removeFeaturedImage = () => {
      setFeaturedImage(null)
      setFeaturedImagePreview(null)
    }

    const handleFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newFiles = Array.from(e.target.files || [])
      if (newFiles.length === 0) return

      const errors: { fileName: string; error: string }[] = []
      const validFiles: File[] = []

      const ALLOWED_TYPES = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'image/jpeg',
        'image/png',
      ]

      // Check total file count
      if (files.length + newFiles.length > 10) {
        setError(`Cannot add ${newFiles.length} file(s). Total would exceed 10 file limit.`)
        return
      }

      newFiles.forEach((file) => {
        // Validate file type
        if (!ALLOWED_TYPES.includes(file.type)) {
          errors.push({
            fileName: file.name,
            error: 'Invalid file type. Allowed: PDF, Word, JPG, PNG',
          })
          return
        }

        // Validate file size (20MB)
        if (file.size > 20 * 1024 * 1024) {
          errors.push({
            fileName: file.name,
            error: `Size ${(file.size / 1024 / 1024).toFixed(2)}MB exceeds 20MB limit`,
          })
          return
        }

        validFiles.push(file)
      })

      setFiles((prev) => [...prev, ...validFiles])
      setFileErrors(errors)

      // Clear error if all files are valid
      if (errors.length === 0) {
        setError(null)
      }
    }

    const removeFile = (index: number) => {
      setFiles((prev) => prev.filter((_, i) => i !== index))
      setFileErrors([])
    }

    const formatFileSize = (bytes: number) => {
      if (bytes < 1024) return bytes + ' B'
      if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
      return (bytes / 1024 / 1024).toFixed(1) + ' MB'
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

        // Prepare FormData if files or featured image are present
        let response
        if (featuredImage || files.length > 0) {
          const formDataPayload = new FormData()
          formDataPayload.append('data', JSON.stringify(requestBody))
        
          if (featuredImage) {
            formDataPayload.append('featuredImage', featuredImage)
          }
        
          files.forEach((file) => {
            formDataPayload.append('files', file)
          })

          response = await fetch('/api/event', {
            method: 'POST',
            body: formDataPayload,
          })
        } else {
          response = await fetch('/api/event', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody),
          })
        }

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

            {/* Location with Autocomplete */}
            <LocationAutocomplete
              organizationId={organizationId || selectedOrgId}
              value={formData.location}
              onChange={(value) => setFormData((prev) => ({ ...prev, location: value }))}
              onCoordinatesChange={(lat, lng) => {
                // When user selects a suggestion, auto-fill coordinates and enable geo
                setLatitude(lat)
                setLongitude(lng)
                if (!enableGeo) {
                  setEnableGeo(true) // Auto-enable geo when selecting from history
                }
              }}
              latitude={enableGeo ? latitude : null}
              longitude={enableGeo ? longitude : null}
              disabled={loading}
            />

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
                <div className="space-y-3 relative z-0">
                  <MapPicker
                    latitude={latitude}
                    longitude={longitude}
                    onChange={(lat, lng) => {
                      setLatitude(lat)
                      setLongitude(lng)
                    }}
                    organizationId={organizationId || selectedOrgId}
                    onLocationSelect={(location, lat, lng) => {
                      // When user clicks a historical location on map, update both location text and coordinates
                      setFormData((prev) => ({ ...prev, location }))
                      setLatitude(lat)
                      setLongitude(lng)
                    }}
                    searchKeyword={formData.location}
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

              {/* Featured Image Upload */}
              <div className="space-y-2">
                <Label htmlFor="featured-image" className="text-sm font-medium text-foreground flex items-center gap-2">
                  <ImageIcon className="h-4 w-4" />
                  Featured Image (Event Poster)
                </Label>
                <p className="text-xs text-muted-foreground">
                  Recommended: 1200x675px (16:9 aspect ratio) • Max 20MB • JPG or PNG
                </p>
                {featuredImagePreview ? (
                  <div className="relative">
                    <img
                      src={featuredImagePreview}
                      alt="Featured image preview"
                      className="w-full h-48 object-cover rounded-md border border-input"
                      onLoad={(e) => {
                        const img = e.target as HTMLImageElement
                        const width = img.naturalWidth
                        const height = img.naturalHeight
                        const aspectRatio = (width / height).toFixed(2)
                        const displayInfo = document.getElementById('featured-image-info')
                        if (displayInfo) {
                          displayInfo.textContent = `${width}x${height}px (${aspectRatio === '1.78' ? '16:9 ✓' : 'Aspect ratio: ' + aspectRatio})`
                        }
                      }}
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      className="absolute top-2 right-2"
                      onClick={removeFeaturedImage}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                    <p id="featured-image-info" className="text-xs text-muted-foreground mt-1">
                      Loading dimensions...
                    </p>
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-input rounded-md p-6 text-center hover:border-primary/50 transition-colors">
                    <input
                      type="file"
                      id="featured-image"
                      accept="image/jpeg,image/png"
                      onChange={handleFeaturedImageChange}
                      className="hidden"
                      disabled={loading}
                    />
                    <label htmlFor="featured-image" className="cursor-pointer">
                      <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                      <p className="text-sm text-foreground">Click to upload featured image</p>
                      <p className="text-xs text-muted-foreground mt-1">JPG or PNG, max 20MB</p>
                    </label>
                  </div>
                )}
              </div>

              {/* Additional Files Upload */}
              <div className="space-y-2">
                <Label htmlFor="files" className="text-sm font-medium text-foreground flex items-center gap-2">
                  <FileIcon className="h-4 w-4" />
                  Event Files
                </Label>
                <p className="text-xs text-muted-foreground">
                  Upload documents or images (PDF, Word, JPG, PNG) • Max 10 files • 20MB per file
                </p>
              
                {/* File List */}
                {files.length > 0 && (
                  <div className="space-y-2 mb-3">
                    {files.map((file, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-3 p-3 bg-muted rounded-md border border-input"
                      >
                        {file.type.startsWith('image/') ? (
                          <ImageIcon className="h-5 w-5 text-primary flex-shrink-0" />
                        ) : (
                          <FileIcon className="h-5 w-5 text-primary flex-shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{file.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatFileSize(file.size)} • {file.type.split('/')[1].toUpperCase()}
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFile(index)}
                          className="flex-shrink-0"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                {/* File Validation Errors */}
                {fileErrors.length > 0 && (
                  <div className="space-y-1 mb-3">
                    {fileErrors.map((error, index) => (
                      <div
                        key={index}
                        className="bg-destructive/10 border border-destructive/30 text-destructive px-3 py-2 rounded-md text-xs"
                      >
                        <strong>{error.fileName}:</strong> {error.error}
                      </div>
                    ))}
                  </div>
                )}

                {/* Upload Button */}
                {files.length < 10 && (
                  <div className="border-2 border-dashed border-input rounded-md p-4 text-center hover:border-primary/50 transition-colors">
                    <input
                      type="file"
                      id="files"
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                      multiple
                      onChange={handleFilesChange}
                      className="hidden"
                      disabled={loading}
                    />
                    <label htmlFor="files" className="cursor-pointer">
                      <Upload className="h-6 w-6 mx-auto text-muted-foreground mb-2" />
                      <p className="text-sm text-foreground">
                        Click to add files ({files.length}/10)
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        PDF, Word, JPG, PNG
                      </p>
                    </label>
                  </div>
                )}
              
                {files.length >= 10 && (
                  <p className="text-xs text-muted-foreground text-center p-2 bg-muted rounded-md">
                    Maximum of 10 files reached
                  </p>
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
