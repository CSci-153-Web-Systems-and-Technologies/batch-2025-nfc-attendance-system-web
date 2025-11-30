'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { DateTimePicker } from '@/components/ui/datetime-picker'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Calendar, MapPin, FileText, ArrowLeft, Loader2, Clock, Crosshair, Ruler, Lock, Upload, X, Image as ImageIcon, FileIcon, Download } from 'lucide-react'
import { LocationAutocomplete } from '@/components/events/location-autocomplete'
import type { Event, EventFile } from '@/types/event'

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

interface EditEventFormProps {
  event: Event
  organizationId: string
  organizationName: string
}

export function EditEventForm({ event, organizationId, organizationName }: EditEventFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Check if event has started (use event_start if available, otherwise fall back to date)
  const eventStartTime = event.event_start ? new Date(event.event_start) : new Date(event.date)
  const hasEventStarted = eventStartTime <= new Date()

  const [formData, setFormData] = useState({
    event_name: event.event_name,
    location: event.location || '',
    description: event.description || '',
  })
  
  const [eventDate, setEventDate] = useState<Date | undefined>(new Date(event.date))
  const [eventEnd, setEventEnd] = useState<Date | undefined>(
    event.event_end ? new Date(event.event_end) : undefined
  )

  // Geolocation feature state - pre-populate from existing event
  const [enableGeo, setEnableGeo] = useState(
    event.latitude !== null && event.longitude !== null
  )
  const [restrictRadius, setRestrictRadius] = useState(
    event.attendance_radius_meters !== null
  )
  const [latitude, setLatitude] = useState<number | null>(event.latitude ?? null)
  const [longitude, setLongitude] = useState<number | null>(event.longitude ?? null)
  const [radius, setRadius] = useState<number>(event.attendance_radius_meters ?? 250)

    // File upload state
    const [existingFiles, setExistingFiles] = useState<EventFile[]>([])
    const [filesToDelete, setFilesToDelete] = useState<string[]>([])
    const [featuredImage, setFeaturedImage] = useState<File | null>(null)
    const [featuredImagePreview, setFeaturedImagePreview] = useState<string | null>(event.featured_image_url || null)
    const [removeFeaturedImageFlag, setRemoveFeaturedImageFlag] = useState(false)
    const [newFiles, setNewFiles] = useState<File[]>([])
    const [fileErrors, setFileErrors] = useState<{ fileName: string; error: string }[]>([])
    const [loadingFiles, setLoadingFiles] = useState(true)

    // Fetch existing files
    useEffect(() => {
      const fetchFiles = async () => {
        try {
          const response = await fetch(`/api/event/${event.id}?details=true`)
          if (response.ok) {
            const data = await response.json()
            // Fetch files separately
            const filesResponse = await fetch(`/api/event/${event.id}/files`)
            if (filesResponse.ok) {
              const filesData = await filesResponse.json()
              setExistingFiles(filesData.files || [])
            }
          }
        } catch (error) {
          console.error('Error fetching files:', error)
        } finally {
          setLoadingFiles(false)
        }
      }
      fetchFiles()
    }, [event.id])

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    setError(null)
  }

    const handleFeaturedImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return

      if (!['image/jpeg', 'image/png'].includes(file.type)) {
        setError('Featured image must be JPEG or PNG')
        return
      }

      if (file.size > 20 * 1024 * 1024) {
        setError(`Featured image size ${(file.size / 1024 / 1024).toFixed(2)}MB exceeds 20MB limit`)
        return
      }

      setFeaturedImage(file)
      setRemoveFeaturedImageFlag(false)
      setError(null)

      const reader = new FileReader()
      reader.onload = (e) => {
        setFeaturedImagePreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }

    const removeFeaturedImage = () => {
      setFeaturedImage(null)
      setFeaturedImagePreview(null)
      setRemoveFeaturedImageFlag(true)
    }

    const handleFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || [])
      if (files.length === 0) return

      const errors: { fileName: string; error: string }[] = []
      const validFiles: File[] = []

      const ALLOWED_TYPES = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'image/jpeg',
        'image/png',
      ]

      const currentTotal = existingFiles.length - filesToDelete.length + newFiles.length
      if (currentTotal + files.length > 10) {
        setError(`Cannot add ${files.length} file(s). Total would exceed 10 file limit.`)
        return
      }

      files.forEach((file) => {
        if (!ALLOWED_TYPES.includes(file.type)) {
          errors.push({
            fileName: file.name,
            error: 'Invalid file type. Allowed: PDF, Word, JPG, PNG',
          })
          return
        }

        if (file.size > 20 * 1024 * 1024) {
          errors.push({
            fileName: file.name,
            error: `Size ${(file.size / 1024 / 1024).toFixed(2)}MB exceeds 20MB limit`,
          })
          return
        }

        validFiles.push(file)
      })

      setNewFiles((prev) => [...prev, ...validFiles])
      setFileErrors(errors)

      if (errors.length === 0) {
        setError(null)
      }
    }

    const removeNewFile = (index: number) => {
      setNewFiles((prev) => prev.filter((_, i) => i !== index))
      setFileErrors([])
    }

    const markFileForDeletion = (fileId: string) => {
      setFilesToDelete((prev) => [...prev, fileId])
    }

    const unmarkFileForDeletion = (fileId: string) => {
      setFilesToDelete((prev) => prev.filter(id => id !== fileId))
    }

    const formatFileSize = (bytes: number) => {
      if (bytes < 1024) return bytes + ' B'
      if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
      return (bytes / 1024 / 1024).toFixed(1) + ' MB'
    }

  const validateForm = (): string | null => {
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
      const requestBody: any = {
        event_name: formData.event_name,
        date: eventDate!.toISOString(),
        location: formData.location || null,
        description: formData.description || null,
      }

      // Geolocation fields
      if (enableGeo) {
        requestBody.latitude = latitude
        requestBody.longitude = longitude
      } else {
        // If geo is disabled, explicitly set to null
        requestBody.latitude = null
        requestBody.longitude = null
      }

      if (enableGeo && restrictRadius) {
        requestBody.attendance_radius_meters = radius
      } else {
        // If radius restriction is disabled, explicitly set to null
        requestBody.attendance_radius_meters = null
      }

      // If event_end is provided, use eventDate as event_start
      if (eventEnd) {
        requestBody.event_start = eventDate!.toISOString()
        requestBody.event_end = eventEnd.toISOString()
      } else {
        // If event_end is removed, set both to null
        requestBody.event_start = null
        requestBody.event_end = null
      }

        // Handle file deletions first
        if (filesToDelete.length > 0) {
          await fetch(`/api/event/${event.id}/files`, {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ fileIds: filesToDelete }),
          })
        }

        // Prepare FormData if new files or featured image changes
        let response
        if (featuredImage || removeFeaturedImageFlag || newFiles.length > 0) {
          const formDataPayload = new FormData()
          formDataPayload.append('data', JSON.stringify(requestBody))
        
          if (featuredImage) {
            formDataPayload.append('featuredImage', featuredImage)
          }
        
          if (removeFeaturedImageFlag) {
            formDataPayload.append('removeFeaturedImage', 'true')
          }

          response = await fetch(`/api/event/${event.id}`, {
            method: 'PUT',
            body: formDataPayload,
          })
        } else {
          response = await fetch(`/api/event/${event.id}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody),
          })
        }

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update event')
      }

        // Upload new files if any
        if (newFiles.length > 0) {
          const filesFormData = new FormData()
          newFiles.forEach((file) => {
            filesFormData.append('files', file)
          })

          await fetch(`/api/event/${event.id}/files`, {
            method: 'POST',
            body: filesFormData,
          })
        }

      // Redirect back to event detail page
      router.push(`/organizations/${organizationId}/events/${event.id}`)
      router.refresh()
    } catch (err) {
      console.error('Error updating event:', err)
      setError(err instanceof Error ? err.message : 'Failed to update event')
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    router.push(`/organizations/${organizationId}/events/${event.id}`)
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
          <h1 className="text-2xl font-bold text-foreground">Edit Event</h1>
          <p className="text-sm text-muted-foreground">for {organizationName}</p>
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
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div>
                      <Label htmlFor="date" className="text-sm font-medium text-foreground flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        Event Date and Time *
                        {hasEventStarted && <Lock className="h-3 w-3 text-muted-foreground" />}
                      </Label>
                      <DateTimePicker
                        date={eventDate}
                        setDate={setEventDate}
                        placeholder="Pick event date and time"
                        disabled={loading || hasEventStarted}
                      />
                      <p className="text-xs text-muted-foreground">
                        When the event starts (also when attendance tracking begins)
                      </p>
                    </div>
                  </TooltipTrigger>
                  {hasEventStarted && (
                    <TooltipContent>
                      <p>Cannot edit date after event has started</p>
                    </TooltipContent>
                  )}
                </Tooltip>
              </TooltipProvider>
            </div>

            {/* Event End (Attendance Window End) */}
            <div className="space-y-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div>
                      <Label htmlFor="event_end" className="text-sm font-medium text-foreground flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        Event End (Optional)
                        {hasEventStarted && <Lock className="h-3 w-3 text-muted-foreground" />}
                      </Label>
                      <DateTimePicker
                        date={eventEnd}
                        setDate={setEventEnd}
                        placeholder="When does attendance close?"
                        disabled={loading || hasEventStarted}
                      />
                      <p className="text-xs text-muted-foreground">
                        When attendance tracking ends
                      </p>
                    </div>
                  </TooltipTrigger>
                  {hasEventStarted && (
                    <TooltipContent>
                      <p>Cannot edit attendance window after event has started</p>
                    </TooltipContent>
                  )}
                </Tooltip>
              </TooltipProvider>
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
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div>
                    <LocationAutocomplete
                      organizationId={organizationId}
                      value={formData.location}
                      onChange={(value) => setFormData((prev) => ({ ...prev, location: value }))}
                      onCoordinatesChange={(lat, lng) => {
                        // When user selects a suggestion, auto-fill coordinates and enable geo
                        setLatitude(lat)
                        setLongitude(lng)
                        if (!enableGeo) {
                          setEnableGeo(true)
                        }
                      }}
                      latitude={enableGeo ? latitude : null}
                      longitude={enableGeo ? longitude : null}
                      disabled={loading || hasEventStarted}
                    />
                  </div>
                </TooltipTrigger>
                {hasEventStarted && (
                  <TooltipContent>
                    <p>Cannot edit location after event has started</p>
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>

            {/* Enable precise map location */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="space-y-2 border rounded-md p-4">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium flex items-center gap-2">
                        <Crosshair className="h-4 w-4" /> Precise Map Location (Optional)
                        {hasEventStarted && <Lock className="h-3 w-3 text-muted-foreground" />}
                      </Label>
                      <input
                        type="checkbox"
                        className="h-4 w-4"
                        checked={enableGeo}
                        onChange={(e) => setEnableGeo(e.target.checked)}
                        disabled={loading || hasEventStarted}
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
                            if (!hasEventStarted) {
                              setLatitude(lat)
                              setLongitude(lng)
                            }
                          }}
                          organizationId={organizationId}
                          onLocationSelect={(location, lat, lng) => {
                            if (!hasEventStarted) {
                              setFormData((prev) => ({ ...prev, location }))
                              setLatitude(lat)
                              setLongitude(lng)
                            }
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
                              disabled={hasEventStarted}
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
                              disabled={hasEventStarted}
                            />
                          </div>
                        </div>
                        {/* Restrict radius */}
                        <div className="space-y-2 mt-2">
                          <div className="flex items-center justify-between">
                            <Label className="text-sm font-medium flex items-center gap-2">
                              <Ruler className="h-4 w-4" /> Restrict Attendance Radius
                              {hasEventStarted && <Lock className="h-3 w-3 text-muted-foreground" />}
                            </Label>
                            <input
                              type="checkbox"
                              className="h-4 w-4"
                              checked={restrictRadius}
                              onChange={(e) => setRestrictRadius(e.target.checked)}
                              disabled={loading || latitude == null || longitude == null || hasEventStarted}
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
                                disabled={hasEventStarted}
                              />
                              <p className="text-xs text-muted-foreground">Radius: {radius} meters</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </TooltipTrigger>
                {hasEventStarted && (
                  <TooltipContent>
                    <p>Cannot edit geolocation settings after event has started</p>
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>

              {/* Featured Image Upload */}
              <div className="space-y-2">
                <Label htmlFor="featured-image" className="text-sm font-medium text-foreground flex items-center gap-2">
                  <ImageIcon className="h-4 w-4" />
                  Featured Image (Event Poster)
                </Label>
                <p className="text-xs text-muted-foreground">
                  Recommended: 1200x675px (16:9 aspect ratio) • Max 20MB • JPG or PNG
                </p>
                {featuredImagePreview && !removeFeaturedImageFlag ? (
                  <div className="relative">
                    <img
                      src={featuredImagePreview}
                      alt="Featured image preview"
                      className="w-full h-48 object-cover rounded-md border border-input"
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
                    {!featuredImage && event.featured_image_url && (
                      <p className="text-xs text-muted-foreground mt-1">Current featured image</p>
                    )}
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

              {/* Event Files Management */}
              <div className="space-y-2">
                <Label htmlFor="files" className="text-sm font-medium text-foreground flex items-center gap-2">
                  <FileIcon className="h-4 w-4" />
                  Event Files
                </Label>
                <p className="text-xs text-muted-foreground">
                  Upload documents or images (PDF, Word, JPG, PNG) • Max 10 files total • 20MB per file
                </p>

                {loadingFiles ? (
                  <div className="flex items-center justify-center p-8 bg-muted rounded-md">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <>
                    {/* Existing Files */}
                    {existingFiles.length > 0 && (
                      <div className="space-y-2 mb-3">
                        <p className="text-xs font-medium text-muted-foreground">Existing Files</p>
                        {existingFiles.map((file) => {
                          const isMarkedForDeletion = filesToDelete.includes(file.id)
                          return (
                            <div
                              key={file.id}
                              className={`flex items-center gap-3 p-3 rounded-md border ${
                                isMarkedForDeletion
                                  ? 'bg-destructive/10 border-destructive/30 opacity-60'
                                  : 'bg-muted border-input'
                              }`}
                            >
                              {file.file_type === 'image' ? (
                                <ImageIcon className="h-5 w-5 text-primary flex-shrink-0" />
                              ) : (
                                <FileIcon className="h-5 w-5 text-primary flex-shrink-0" />
                              )}
                              <div className="flex-1 min-w-0">
                                <p className={`text-sm font-medium truncate ${isMarkedForDeletion ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                                  {file.file_name}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {formatFileSize(file.file_size_bytes)} • {file.mime_type.split('/')[1].toUpperCase()}
                                </p>
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                <a
                                  href={file.file_url}
                                  download
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-primary hover:text-primary/80"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <Download className="h-4 w-4" />
                                </a>
                                {isMarkedForDeletion ? (
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => unmarkFileForDeletion(file.id)}
                                  >
                                    Undo
                                  </Button>
                                ) : (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => markFileForDeletion(file.id)}
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}

                    {/* New Files to Upload */}
                    {newFiles.length > 0 && (
                      <div className="space-y-2 mb-3">
                        <p className="text-xs font-medium text-muted-foreground">New Files to Upload</p>
                        {newFiles.map((file, index) => (
                          <div
                            key={index}
                            className="flex items-center gap-3 p-3 bg-primary/5 rounded-md border border-primary/20"
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
                              onClick={() => removeNewFile(index)}
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

                    {/* Add Files Button */}
                    {existingFiles.length - filesToDelete.length + newFiles.length < 10 && (
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
                            Click to add files ({existingFiles.length - filesToDelete.length + newFiles.length}/10)
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            PDF, Word, JPG, PNG
                          </p>
                        </label>
                      </div>
                    )}

                    {existingFiles.length - filesToDelete.length + newFiles.length >= 10 && (
                      <p className="text-xs text-muted-foreground text-center p-2 bg-muted rounded-md">
                        Maximum of 10 files reached
                      </p>
                    )}
                  </>
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
                    Saving...
                  </>
                ) : (
                  'Save Changes'
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
